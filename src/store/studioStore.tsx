import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { isNsfwCostume, isNsfwPose } from '@/api/gallery'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { idbGet, idbSet } from '@/lib/idbStorage'
import { recipeBackup } from '@/lib/recipeImages'
import {
  buildRecipePrompt,
  DEFAULT_STUDIO_MODEL,
  generateCharacterImage,
  type GenerationProgress,
  STYLE_PRESETS,
  stitchRecipeCanvas,
} from '@/services/aiGenerator'
import type {
  ApiConfig,
  CostumeItem,
  ExtraReferenceImage,
  GenerationHistoryItem,
  PortraitItem,
  PoseItem,
  RecipeState,
  StudioParams,
} from '@/types/gallery'

const CFG_KEY = 'pose_atlas_api_config_v3'
const RECIPE_KEY = 'pose_atlas_recipe_v3'
const HISTORY_KEY = 'pose_atlas_history_v3'
const SAFE_MODE_KEY = 'pose_atlas_safe_mode_v1'

/** 配置结构版本：v4 起出图只走站内 studio，旧版各厂商（Key、Base URL、ComfyUI 工作流等）配置一律丢弃 */
const API_CONFIG_VERSION = 4

const STUDIO_SIZES: StudioParams['size'][] = ['auto', '2:3', '3:4', '1:1', '4:3', '3:2', '9:16', '16:9']
const STUDIO_QUALITIES: StudioParams['quality'][] = ['auto', 'low', 'medium', 'high']

const DEFAULT_API_CONFIG: ApiConfig = {
  configVersion: API_CONFIG_VERSION,
  stylePreset: 'realistic',
  sendStitchedSheet: false,
  studioParams: {
    model: DEFAULT_STUDIO_MODEL,
    size: '2:3',
    quality: 'auto',
  },
}

// 本地存储的配置只挑认识且合法的字段，其余（旧版 providers、gptParams、comfyuiParams、useProxy…）直接忽略，
// 残留配置不会报错，下次保存时也会被覆盖掉
function mergeStoredConfig(raw: unknown): ApiConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_API_CONFIG
  const obj = raw as Record<string, any>
  const sp = obj.studioParams && typeof obj.studioParams === 'object' ? obj.studioParams : {}
  return {
    configVersion: API_CONFIG_VERSION,
    stylePreset: typeof obj.stylePreset === 'string' && obj.stylePreset in STYLE_PRESETS ? obj.stylePreset : DEFAULT_API_CONFIG.stylePreset,
    sendStitchedSheet: typeof obj.sendStitchedSheet === 'boolean' ? obj.sendStitchedSheet : DEFAULT_API_CONFIG.sendStitchedSheet,
    studioParams: {
      model: typeof sp.model === 'string' && sp.model.trim() ? sp.model.trim() : DEFAULT_STUDIO_MODEL,
      size: STUDIO_SIZES.includes(sp.size) ? sp.size : DEFAULT_API_CONFIG.studioParams.size,
      quality: STUDIO_QUALITIES.includes(sp.quality) ? sp.quality : DEFAULT_API_CONFIG.studioParams.quality,
    },
  }
}

interface StudioContextValue {
  recipe: RecipeState
  apiConfig: ApiConfig
  history: GenerationHistoryItem[]
  safeMode: boolean
  toggleSafeMode: () => void
  requestUnlockNsfw: (onUnlocked?: () => void) => void
  poseDepthMode: boolean
  setPoseDepthMode: (val: boolean) => void
  toggleRecipePoseDepth: () => void
  // 全局持久化的合成台状态（切换页面不丢失、不断开请求）
  customPrompt: string | null
  setCustomPrompt: (val: string | null) => void
  previewUrl: string
  setPreviewUrl: (url: string) => void
  isGenerating: boolean
  generatingModel: string
  generationProgress: GenerationProgress | null
  generationError: string
  startGeneration: (overridePrompt?: string) => Promise<void>
  refreshStitchPreview: () => Promise<void>
  setPortrait: (item: PortraitItem | null) => void
  setCostume: (item: CostumeItem | null) => void
  setPose: (item: PoseItem | null) => void
  togglePortrait: (item: PortraitItem) => void
  toggleCostume: (item: CostumeItem) => void
  togglePose: (item: PoseItem) => void
  addExtraImage: (item: { name: string; url: string }) => void
  removeExtraImage: (id: string) => void
  updateExtraImageName: (id: string, name: string) => void
  clearRecipe: () => void
  randomizeRecipe: (pools: { portraits?: PortraitItem[]; costumes?: CostumeItem[]; poses?: PoseItem[] }) => void
  updateApiConfig: (patch: Partial<ApiConfig>) => void
  updateStudioParams: (patch: Partial<StudioParams>) => void
  addHistory: (item: Omit<GenerationHistoryItem, 'id' | 'createdAt'>) => void
  removeHistoryItem: (id: string) => void
  clearHistory: () => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: { children: ReactNode }) {
  const [recipe, setRecipe] = useState<RecipeState>(() => {
    try {
      const raw = localStorage.getItem(RECIPE_KEY)
      if (!raw) return { portrait: null, costume: null, pose: null, extraImages: [] }
      const parsed = JSON.parse(raw)
      return {
        portrait: parsed.portrait ?? null,
        costume: parsed.costume ?? null,
        pose: parsed.pose ?? null,
        extraImages: Array.isArray(parsed.extraImages) ? parsed.extraImages : [],
      }
    } catch {
      return { portrait: null, costume: null, pose: null, extraImages: [] }
    }
  })

  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    try {
      const raw = localStorage.getItem(CFG_KEY)
      return raw ? mergeStoredConfig(JSON.parse(raw)) : DEFAULT_API_CONFIG
    } catch {
      return DEFAULT_API_CONFIG
    }
  })

  const [history, setHistory] = useState<GenerationHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [safeMode, setSafeMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SAFE_MODE_KEY)
      return raw === null ? true : raw !== 'false'
    } catch {
      return true
    }
  })
  const [ageGateOpen, setAgeGateOpen] = useState(false)
  const pendingUnlockCbRef = useRef<(() => void) | null>(null)
  const [poseDepthMode, setPoseDepthModeState] = useState<boolean>(() => Boolean(recipe.pose?.useDepth))

  // 提升到根部 Provider 的生成状态，路由切换不会卸载或中断
  const [customPrompt, setCustomPrompt] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      const list = raw ? JSON.parse(raw) : []
      return list[0]?.imageUrl || ''
    } catch {
      return ''
    }
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingModel, setGeneratingModel] = useState('')
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [generationError, setGenerationError] = useState('')
  const isGeneratingRef = useRef(false)
  const [idbHydrated, setIdbHydrated] = useState(false)

  // 从 IndexedDB 异步恢复大容量历史记录与含附图的配方
  useEffect(() => {
    let active = true
    Promise.all([
      idbGet<RecipeState>(RECIPE_KEY),
      idbGet<GenerationHistoryItem[]>(HISTORY_KEY),
    ]).then(([savedRecipe, savedHistory]) => {
      if (!active) return
      if (savedRecipe) {
        if (savedRecipe.pose?.useDepth !== undefined) {
          setPoseDepthModeState(Boolean(savedRecipe.pose.useDepth))
        }
        setRecipe({
          portrait: savedRecipe.portrait ?? null,
          costume: savedRecipe.costume ?? null,
          pose: savedRecipe.pose ?? null,
          extraImages: Array.isArray(savedRecipe.extraImages) ? savedRecipe.extraImages : [],
        })
      }
      if (Array.isArray(savedHistory) && savedHistory.length > 0) {
        setHistory(savedHistory)
        setPreviewUrl((prev) => prev || savedHistory[0]?.imageUrl || '')
      }
      setIdbHydrated(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!idbHydrated) return
    void idbSet(RECIPE_KEY, recipe)
    try {
      // 上传图片和附图完整保存在 IndexedDB，轻量备份不包含它们。
      localStorage.setItem(
        RECIPE_KEY,
        JSON.stringify(recipeBackup(recipe))
      )
    } catch {}
  }, [recipe, idbHydrated])

  useEffect(() => {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(apiConfig))
    } catch {}
  }, [apiConfig])

  useEffect(() => {
    try {
      localStorage.setItem(SAFE_MODE_KEY, String(safeMode))
    } catch {}
  }, [safeMode])

  const requestUnlockNsfw = (onUnlocked?: () => void) => {
    if (!safeMode) {
      onUnlocked?.()
      return
    }
    pendingUnlockCbRef.current = onUnlocked || null
    setAgeGateOpen(true)
  }

  const confirmUnlockNsfw = () => {
    setSafeMode(false)
    setAgeGateOpen(false)
    toast.success('已解锁 18+ 完整图库模式')
    const cb = pendingUnlockCbRef.current
    pendingUnlockCbRef.current = null
    cb?.()
  }

  const toggleSafeMode = () => {
    if (safeMode) {
      requestUnlockNsfw()
    } else {
      setSafeMode(true)
      toast.success('已开启安全模式（已隐藏 18+ 敏感分类）')
    }
  }

  useEffect(() => {
    if (!idbHydrated) return
    void idbSet(HISTORY_KEY, history.slice(0, 30))
  }, [history, idbHydrated])

  const setPortrait = (portrait: PortraitItem | null) => setRecipe((r) => ({ ...r, portrait }))
  const setCostume = (costume: CostumeItem | null) => setRecipe((r) => ({ ...r, costume }))
  const setPose = (pose: PoseItem | null) => setRecipe((r) => ({ ...r, pose }))

  const setPoseDepthMode = (val: boolean) => {
    setPoseDepthModeState(val)
    setRecipe((r) => {
      if (!r.pose || r.pose.source === 'upload' || Boolean(r.pose.useDepth) === val) return r
      return { ...r, pose: { ...r.pose, useDepth: val } }
    })
  }

  const toggleRecipePoseDepth = () => {
    const next = !(recipe.pose?.useDepth ?? poseDepthMode)
    setPoseDepthMode(next)
    toast.success(next ? '已切换姿势图为：深度图 (Depth)' : '已切换姿势图为：素体白模')
  }

  const togglePortrait = (item: PortraitItem) => {
    setRecipe((r) => {
      const remove = r.portrait?.id === item.id
      toast.success(remove ? '已移除人像' : `已选人像：${item.发型名称}`)
      return { ...r, portrait: remove ? null : item }
    })
  }

  const toggleCostume = (item: CostumeItem) => {
    setRecipe((r) => {
      const remove = r.costume?.id === item.id
      toast.success(remove ? '已移除服装' : `已选服装：${item.服装名称}`)
      return { ...r, costume: remove ? null : item }
    })
  }

  const togglePose = (item: PoseItem) => {
    const useDepth = item.source === 'upload' ? false : (item.useDepth ?? poseDepthMode)
    setRecipe((r) => {
      const remove = r.pose?.id === item.id && Boolean(r.pose?.useDepth) === useDepth
      toast.success(
        remove
          ? '已移除姿势'
          : `已选姿势：${item.姿势名称}（${item.角度}${useDepth ? ' · 深度图' : ''}）`
      )
      return { ...r, pose: remove ? null : { ...item, useDepth } }
    })
  }

  const addExtraImage = (item: { name: string; url: string }) => {
    const newImg: ExtraReferenceImage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name || '附加参考',
      url: item.url,
    }
    setRecipe((r) => ({
      ...r,
      extraImages: [...(r.extraImages || []), newImg],
    }))
    toast.success('已添加附加参考图')
  }

  const removeExtraImage = (id: string) => {
    setRecipe((r) => ({
      ...r,
      extraImages: (r.extraImages || []).filter((x) => x.id !== id),
    }))
  }

  const updateExtraImageName = (id: string, name: string) => {
    setRecipe((r) => ({
      ...r,
      extraImages: (r.extraImages || []).map((x) => (x.id === id ? { ...x, name } : x)),
    }))
  }

  const clearRecipe = () => {
    setRecipe({ portrait: null, costume: null, pose: null, extraImages: [] })
    toast.success('已清空配方')
  }

  const randomizeRecipe = (pools: { portraits?: PortraitItem[]; costumes?: CostumeItem[]; poses?: PoseItem[] }) => {
    const posePool = safeMode ? (pools.poses || []).filter((p) => !isNsfwPose(p)) : pools.poses || []
    const costumePool = safeMode ? (pools.costumes || []).filter((c) => !isNsfwCostume(c)) : pools.costumes || []
    const portraitPool = pools.portraits || []

    setRecipe((prev) => ({
      ...prev,
      portrait: portraitPool.length
        ? portraitPool[Math.floor(Math.random() * portraitPool.length)]
        : prev.portrait,
      costume: costumePool.length
        ? costumePool[Math.floor(Math.random() * costumePool.length)]
        : prev.costume,
      pose: posePool.length
        ? { ...posePool[Math.floor(Math.random() * posePool.length)], useDepth: poseDepthMode }
        : prev.pose,
    }))
    toast.success(safeMode ? '已随机抽取一套角色配方（安全模式）' : '已随机抽取一套角色配方')
  }

  const updateApiConfig = (patch: Partial<ApiConfig>) => {
    setApiConfig((prev) => ({ ...prev, ...patch }))
  }

  const updateStudioParams = (patch: Partial<StudioParams>) => {
    setApiConfig((prev) => ({ ...prev, studioParams: { ...prev.studioParams, ...patch } }))
  }

  const addHistory = (item: Omit<GenerationHistoryItem, 'id' | 'createdAt'>) => {
    setHistory((prev) => [
      { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() },
      ...prev.slice(0, 29),
    ])
  }

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((x) => x.id !== id))
    toast.success('已删除该条记录')
  }

  const clearHistory = () => {
    setHistory([])
    void idbSet(HISTORY_KEY, [])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {}
    toast.success('已清空记录')
  }

  const refreshStitchPreview = async () => {
    try {
      const url = await stitchRecipeCanvas(recipe)
      setPreviewUrl(url)
      toast.success('已合成参考拼图')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '拼图失败')
    }
  }

  const startGeneration = async (overridePrompt?: string) => {
    if (isGeneratingRef.current) return
    const recipeSnapshot = recipe
    const configSnapshot = apiConfig
    const modelName = configSnapshot.studioParams.model
    const finalPrompt =
      overridePrompt ?? customPrompt ?? buildRecipePrompt(recipeSnapshot, configSnapshot.stylePreset)

    isGeneratingRef.current = true
    setIsGenerating(true)
    setGeneratingModel(modelName)
    setGenerationError('')
    setGenerationProgress(null)

    try {
      const { imageUrl, modelUsed, providerUsed } = await generateCharacterImage({
        recipe: recipeSnapshot,
        prompt: finalPrompt,
        config: configSnapshot,
        onProgress: setGenerationProgress,
      })
      setPreviewUrl(imageUrl)
      const extraCount = (recipeSnapshot.extraImages || []).length
      const summary = [
        recipeSnapshot.portrait?.发型名称,
        recipeSnapshot.costume?.source === 'upload' ? recipeSnapshot.costume.服装名称 : recipeSnapshot.costume?.分类,
        recipeSnapshot.pose ? `${recipeSnapshot.pose.姿势名称}${recipeSnapshot.pose.角度 ? `(${recipeSnapshot.pose.角度})` : ''}` : null,
        extraCount ? `+${extraCount}附图` : null,
      ]
        .filter(Boolean)
        .join(' + ')
      addHistory({
        provider: providerUsed,
        model: modelUsed,
        prompt: finalPrompt,
        imageUrl,
        recipeSummary: summary || '自定义合成',
      })
      toast.success(`角色图生成完成 (${modelUsed})`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '调用失败'
      setGenerationError(msg)
      toast.error(msg.split('\n')[0])
    } finally {
      isGeneratingRef.current = false
      setIsGenerating(false)
      setGenerationProgress(null)
    }
  }

  return (
    <StudioContext.Provider
      value={{
        recipe,
        apiConfig,
        history,
        safeMode,
        toggleSafeMode,
        requestUnlockNsfw,
        poseDepthMode,
        setPoseDepthMode,
        toggleRecipePoseDepth,
        customPrompt,
        setCustomPrompt,
        previewUrl,
        setPreviewUrl,
        isGenerating,
        generatingModel,
        generationProgress,
        generationError,
        startGeneration,
        refreshStitchPreview,
        setPortrait,
        setCostume,
        setPose,
        togglePortrait,
        toggleCostume,
        togglePose,
        addExtraImage,
        removeExtraImage,
        updateExtraImageName,
        clearRecipe,
        randomizeRecipe,
        updateApiConfig,
        updateStudioParams,
        addHistory,
        removeHistoryItem,
        clearHistory,
      }}
    >
      {children}

      <AlertDialog open={ageGateOpen} onOpenChange={setAgeGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔞 年龄确认与免责声明（NSFW 18+）</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left leading-relaxed">
              <span className="block">
                关闭「安全模式 (SFW)」后，图库将显示包含成人向艺术参考的敏感分类：
              </span>
              <span className="block rounded-lg bg-muted p-2.5 text-xs text-foreground">
                • <strong>动作姿势库</strong>：全身单人・性感系（399 张）、双人缠绵（275 张）
                <br />• <strong>服装穿搭库</strong>：内衣・睡衣（199 套）、性感穿搭（140 套）
              </span>
              <span className="block text-xs">
                <strong>免责声明</strong>：
                <br />1. <strong>年龄限制</strong>：未满 18 周岁的未成年人严禁关闭安全模式或浏览上述敏感分类。
                <br />2. <strong>来源说明</strong>：图鉴素材源自原作者 ギア（@giaaibusi）公开分享，仅供个人学习交流，严禁商业倒卖。
                <br />3. <strong>合法使用</strong>：本工具与素材<strong>仅供 AI 绘画学习与合法艺术创作使用，严禁用于任何违法违规、色情传播或侵害他人肖像权（如未经授权的真人换脸）等用途</strong>，使用者须自行承担一切法律责任。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                pendingUnlockCbRef.current = null
              }}
            >
              保持安全模式
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlockNsfw}>
              我已年满 18 岁并同意免责声明
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudioContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}
