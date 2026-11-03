import type { ApiConfig, RecipeState } from '@/types/gallery'
import { queryOptions } from '@tanstack/react-query'
import { poseImagePath, referenceImageUrl } from '@/lib/recipeImages'

// 出图只有一个来源：集群内 studio 生图总入口（OpenAI 兼容）。以后要加模型也从 studio 侧引入，前端只从 /models 动态拉取。
export const DEFAULT_STUDIO_MODEL = 'gpt-image-2'
// 同源反代：集群里 nginx 把 /api/studio/v1/* 转到 studio 并注入调用方令牌，浏览器不持有任何 Key
export const STUDIO_API_BASE = '/api/studio/v1'

export const STYLE_PRESETS: Record<string, { label: string; prompt: string }> = {
  none: {
    label: '无预设（跟随参考图）',
    prompt: '',
  },
  realistic: {
    label: '写实人像写真',
    prompt: '写实商业摄影级质感，85mm 人像镜头，自然柔和光影，真实肌肤纹理与织物细节，8k 高清画质。',
  },
  fashion: {
    label: '日韩杂志画报',
    prompt: '日韩时尚穿搭杂志画报风格，干净极简摄影棚背景，高级色调，突出人物颜值与服装剪裁。',
  },
  film: {
    label: '复古胶片写真',
    prompt: '35mm 富士胶片摄影质感，轻微胶片颗粒，柔和复古暖调，自然街拍光影与电影呼吸感。',
  },
  semi_real: {
    label: '2.5D 游戏原画立绘',
    prompt: '2.5D 半写实高精度游戏角色原画，唯美厚涂光影，精致五官与华丽布料金属质感。',
  },
  anime: {
    label: '日系二次元插画',
    prompt: '日系精致二次元插画风格，细腻赛璐璐与厚涂光影过渡，动漫角色立绘质感，色彩通透干净。',
  },
  cel_anime: {
    label: '新海诚感动画电影',
    prompt: '动画电影级画面质感，清澈高饱和光影，细腻体积光与发丝高光，干净唯美的动漫色彩。',
  },
  manga: {
    label: '日式黑白漫画网点',
    prompt: '日本黑白漫画原稿风格，利落精准的G笔线稿，细腻漫画网点纸阴影与层次对比。',
  },
  render3d: {
    label: '3D 次世代角色渲染',
    prompt: 'Unreal Engine 5 / Octane Render 次世代 3D 角色渲染，细腻次表面散射肌肤材质，电影级布光。',
  },
  chibi_box: {
    label: '3D 潮玩手办质感',
    prompt: '高品质 PVC 涂装完成品手办质感，柔和摄影棚柔光箱布光，精致材质高光与微距景深。',
  },
  cyberpunk: {
    label: '赛博朋克霓虹',
    prompt: '赛博朋克科幻视觉风格，雨夜霓虹冷暖双色轮廓光，未来感材质反光与电影级氛围。',
  },
  concept_sheet: {
    label: '角色设定集立绘（纯白底）',
    prompt: '标准角色设定集全身立绘，纯白干净无杂物背景，均匀漫反射布光，清晰展示全身服装结构与配饰细节。',
  },
}

// 按实际传入模型的图片顺序动态生成「图1 / 图2 / 图3...」明确指代，支持附加上传图片
// 用自然语言逐项描述（人物 / 服装 / 姿势），实测比堆砌要点更能让多图编辑模型还原服装、避免照搬人体模型线条
const PHOTO_STYLES = new Set(['realistic', 'fashion', 'film'])

/** 配方为空时 buildRecipePrompt 返回的占位提示 */
export const EMPTY_RECIPE_PROMPT = '请先选择人像/服装/姿势或上传附加参考图。'

export function buildRecipePrompt(recipe: RecipeState, stylePreset = 'realistic'): string {
  const styleInfo = STYLE_PRESETS[stylePreset] ?? STYLE_PRESETS.realistic
  const isPhoto = PHOTO_STYLES.has(stylePreset)
  const faceless = !recipe.portrait && Boolean(recipe.costume && recipe.pose)
  const clauses: string[] = []
  let idx = 1
  let costumeIdx = 0

  if (recipe.portrait) {
    const hairDesc =
      recipe.portrait.发型名称 && recipe.portrait.发型名称 !== '标准基础款'
        ? recipe.portrait.标题
        : recipe.portrait.发长
    const skin = '人物的肤色必须与图一人物一致，所有裸露皮肤（包括服装镂空处露出的皮肤）必须与脸部肤色统一，统一后的肤色与质感按风格要求呈现。'
    const outfit = recipe.costume ? '' : '保留图1人物原有可见服装与配饰，不复制姿势参考图的服装或白模外观。'
    clauses.push(
      recipe.portrait.source === 'upload'
        ? `• 人物：图${idx}中的人物，保持其脸型、五官、发型和发色一致。${skin}${outfit}`
        : `• 人物：图${idx}中的人物，保持其脸型、五官、发型（${hairDesc}）和发色一致。${skin}${outfit}`
    )
    idx++
  }
  if (recipe.costume) {
    costumeIdx = idx
    clauses.push(
      recipe.costume.source === 'upload'
        ? `• 服装：让人物穿上图${idx}中展示的整套服装和配饰，每件单品的颜色、款式、面料与配饰都以图${idx}为准。`
        : `• 服装：让人物穿上图${idx}中展示的整套服装和配饰（参考名称：${recipe.costume.服装名称}），每件单品的颜色、款式、面料与配饰都以图${idx}为准，名称仅作辅助说明。`
    )
    idx++
  }
  if (recipe.pose) {
    const wear = costumeIdx ? `，穿着图${costumeIdx}的服装` : ''
    const body = isPhoto
      ? `最终画面中的人物是真人，皮肤真实自然${wear}`
      : `人物的肤色与质感按风格要求呈现${wear}`
    clauses.push(
      recipe.pose.source === 'upload'
        ? `• 姿势：按照图${idx}中的人物动作和镜头角度摆姿势；仅参考姿势与构图，不复制图${idx}人物的外观与服装，${body}。`
        : `• 姿势：按照图${idx}中人体模型的动作和镜头角度摆姿势（${recipe.pose.姿势名称}，${recipe.pose.角度}）；图${idx}只是动作示意，${body}。`
    )
    idx++
  }
  if (faceless) {
    clauses.push('• 无脸展示：生成一位穿着参考服装的成年展示人物，脸部保持无五官的自然肤色表面，不添加眼睛、鼻子、嘴巴或具体人物身份；全身裸露皮肤的颜色统一，不照搬服装图或姿势图的灰白人台材质。')
  }
  for (const extra of recipe.extraImages || []) {
    clauses.push(
      `• 附加参考：融合图${idx}（${extra.name || '补充元素'}）中的元素、配饰、背景或光影细节。`
    )
    idx++
  }

  if (clauses.length === 0) {
    return EMPTY_RECIPE_PROMPT
  }

  const lines = [
    `请根据提供的 ${idx - 1} 张参考图，生成一张完整的${faceless ? '人物穿搭展示图' : isPhoto ? '真实人物照片' : '人物图像'}：`,
    ...clauses,
  ]
  if (styleInfo.prompt) {
    lines.push(`• 风格：${styleInfo.prompt} ${faceless ? '人物比例协调，手部自然，脸部无五官，光影统一。' : '人物比例协调，手部与五官自然，光影统一。'}`)
  }
  lines.push('画面中没有任何文字、标志或水印。')
  return lines.join('\n')
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxSide = 1024
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('解析图片失败'))
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`加载图片失败: ${src}`))
    if (src.startsWith('data:') || /^https?:\/\//i.test(src) || src.startsWith('/')) {
      img.src = src
    } else {
      img.src = `/${src}`
    }
  })
}

export async function stitchRecipeCanvas(recipe: RecipeState): Promise<string> {
  const list: Array<{ tag: string; sub: string; src: string }> = []
  let idx = 1

  if (recipe.portrait) {
    list.push({
      tag: `图${idx++} · 人像`,
      sub: recipe.portrait.标题,
      src: recipe.portrait.原图 || recipe.portrait.缩略图,
    })
  }
  if (recipe.costume) {
    list.push({
      tag: `图${idx++} · 服装`,
      sub: `${recipe.costume.分类} · ${recipe.costume.服装名称}`,
      src: recipe.costume.预览图 || recipe.costume.原图 || recipe.costume.缩略图,
    })
  }
  if (recipe.pose) {
    list.push({
      tag: `图${idx++} · 姿势`,
      sub: `${recipe.pose.姿势名称}（${recipe.pose.角度}${recipe.pose.useDepth ? ' · 深度图' : ''}）`,
      src: poseImagePath(recipe.pose),
    })
  }
  for (const extra of recipe.extraImages || []) {
    list.push({
      tag: `图${idx++} · 附加`,
      sub: extra.name || '自定义参考图',
      src: extra.url,
    })
  }

  if (!list.length) {
    throw new Error('请至少选择或上传 1 张参考图')
  }

  const imgs = await Promise.all(list.map((x) => loadImage(x.src)))
  const cardW = 480
  const cardH = 640
  const pad = 20
  const headH = 62
  const canvas = document.createElement('canvas')
  canvas.width = list.length * cardW + (list.length + 1) * pad
  canvas.height = cardH + headH + pad * 2
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#111318'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  imgs.forEach((img, i) => {
    const x = pad + i * (cardW + pad)
    const y = pad
    ctx.fillStyle = '#1e222b'
    ctx.fillRect(x, y, cardW, cardH + headH)
    ctx.fillStyle = '#f4f5f7'
    ctx.fillRect(x, y + headH, cardW, cardH)

    const scale = Math.min(cardW / img.width, cardH / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, x + (cardW - dw) / 2, y + headH + (cardH - dh) / 2, dw, dh)

    ctx.fillStyle = '#a1a1aa'
    ctx.font = '600 12px Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    ctx.fillText(list[i].tag, x + 14, y + 23)

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 15px Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    ctx.fillText(list[i].sub.slice(0, 26), x + 14, y + 46)
  })

  return canvas.toDataURL('image/jpeg', 0.92)
}

async function srcToPngDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:image/')) return src
  const img = await loadImage(src)
  const maxSide = 1024
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale)
  c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/:(.*?);/)?.[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}


// OpenAI 图片接口响应：data[0].b64_json 或 data[0].url
function extractImage(json: any): string | null {
  if (json?.data?.[0]?.b64_json) return `data:image/png;base64,${json.data[0].b64_json}`
  if (json?.data?.[0]?.url) return json.data[0].url
  return null
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text.slice(0, 300) }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取生成结果失败'))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export interface GenerationProgress {
  stage: 'check' | 'upload' | 'queue' | 'running' | 'download'
  message: string
  /** 0-100，未知时为 undefined */
  percent?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** studio 给本站令牌开放的逻辑模型（GET /api/studio/v1/models）；拉取失败时只给默认模型 */
export async function fetchStudioModels(): Promise<string[]> {
  const res = await fetch(`${STUDIO_API_BASE}/models`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`[studio] 获取模型列表失败 (HTTP ${res.status})`)
  const json = await res.json()
  const ids = Array.isArray(json?.data)
    ? json.data.map((m: any) => (typeof m?.id === 'string' ? m.id : '')).filter(Boolean)
    : []
  return ids.length ? ids : [DEFAULT_STUDIO_MODEL]
}

export const studioModelsQuery = queryOptions({
  queryKey: ['studio-models'],
  queryFn: fetchStudioModels,
  staleTime: 10 * 60 * 1000,
  retry: 1,
})

// =========================================================================
// 站内 studio（集群内生图总入口，OpenAI 兼容接口）
// 浏览器只请求同源 /api/studio/v1/*，由 Pod 里的 nginx 反代到 studio 并注入调用方令牌。
// 经 Cloudflare 单请求 100 秒上限：请求带 X-Studio-Wait 只等 60 秒，超时 studio 回 504 + X-Studio-Job-Id，
// 之后每 3 秒轮询 /jobs/{id}，done 后取 /files/{image_id}（PNG）转成 data URL 展示。
// =========================================================================
const STUDIO_WAIT_SECONDS = 60
const STUDIO_POLL_MS = 3000
const STUDIO_MAX_WAIT_MS = 10 * 60 * 1000
/** studio /images/edits 一次最多收 4 张图 */
const STUDIO_MAX_IMAGES = 4

const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// 参考图转 Blob：图库图片与本站同源（/img、/thumbs 由 CF Worker 路由提供），上传图是 data URL，直接 fetch；
// 外链图片 fetch 被 CORS 拦下时退回 canvas 重绘（仍需对方允许跨域）
async function srcToBlob(src: string): Promise<Blob> {
  try {
    const res = await fetch(referenceImageUrl(src), { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    // CF Access 会话过期等情况下可能拿到 HTML 登录页，不能当图片上传
    if (blob.type && !blob.type.startsWith('image/')) throw new Error(`不是图片：${blob.type}`)
    return blob
  } catch {
    try {
      return dataUrlToBlob(await srcToPngDataUrl(src))
    } catch {
      throw new Error(`读取参考图失败：${src.slice(0, 80)}（若为外链图片，请先下载后再上传）`)
    }
  }
}

function studioErrorText(json: any, status: number): string {
  return json?.error?.message || json?.message || json?._raw || `请求失败 (HTTP ${status})`
}

async function fetchStudioFile(imageId: string): Promise<string> {
  const res = await fetch(`${STUDIO_API_BASE}/files/${encodeURIComponent(imageId)}`)
  if (!res.ok) {
    throw new Error(`[studio] 取回图片失败：${studioErrorText(await readJsonSafe(res), res.status)}`)
  }
  return blobToDataUrl(await res.blob())
}

async function pollStudioJob(
  jobId: string,
  startedAt: number,
  report: (p: GenerationProgress) => void
): Promise<string> {
  let failures = 0
  while (Date.now() - startedAt < STUDIO_MAX_WAIT_MS) {
    await sleep(STUDIO_POLL_MS)
    const elapsed = Math.round((Date.now() - startedAt) / 1000)
    const polled = await fetch(`${STUDIO_API_BASE}/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' })
      .then(async (r) => ({ res: r, json: await readJsonSafe(r) }))
      .catch(() => null)
    if (!polled) {
      // 网络抖动：连续失败 5 次才放弃，任务本身仍在 studio 里继续
      if (++failures >= 5) throw new Error(`[studio] 连续 5 次查询任务状态失败（任务 ${jobId}），请稍后在 studio 队列里查看`)
      continue
    }
    const { res, json } = polled
    if (!res.ok) {
      if (res.status >= 500 && ++failures < 5) continue
      throw new Error(`[studio] 查询任务失败：${studioErrorText(json, res.status)}`)
    }
    failures = 0
    switch (json?.status) {
      case 'done':
        if (!json.image_id) throw new Error('[studio] 任务已完成但没有返回图片')
        report({ stage: 'download', message: '正在取回生成结果…' })
        return fetchStudioFile(json.image_id)
      case 'failed':
        throw new Error(`[studio] 生成失败：${json.error || '未知原因'}`)
      case 'cancelled':
        throw new Error('[studio] 任务已在 studio 中被取消')
      case 'queued':
        report({ stage: 'queue', message: `studio 排队中…（已等待 ${elapsed} 秒）` })
        break
      default:
        report({ stage: 'running', message: `studio 生成中…（已等待 ${elapsed} 秒）` })
    }
  }
  throw new Error(`[studio] 等待超过 ${STUDIO_MAX_WAIT_MS / 60000} 分钟仍未出图（任务 ${jobId}），可稍后在 studio 队列里查看`)
}

export async function generateCharacterImage(params: {
  recipe: RecipeState
  prompt: string
  config: ApiConfig
  onProgress?: (p: GenerationProgress) => void
}): Promise<{ imageUrl: string; modelUsed: string; providerUsed: string }> {
  const { recipe, prompt, config } = params
  const report = params.onProgress ?? (() => {})
  const sp = config.studioParams
  const model = sp.model.trim() || DEFAULT_STUDIO_MODEL
  const startedAt = Date.now()

  // 顺序与 GPT 路径一致：人像 → 服装 → 姿势 → 附加参考图（提示词里的「图1/图2…」按这个顺序编号）
  const sources = [
    recipe.portrait && (recipe.portrait.原图 || recipe.portrait.缩略图),
    recipe.costume && (recipe.costume.预览图 || recipe.costume.原图 || recipe.costume.缩略图),
    recipe.pose && poseImagePath(recipe.pose),
    ...(recipe.extraImages || []).map((x) => x.url),
  ].filter(Boolean) as string[]

  if (!sources.length && (!prompt.trim() || prompt.trim() === EMPTY_RECIPE_PROMPT)) {
    throw new Error('请先选择参考图，或在提示词里写下要生成的画面')
  }
  const withSheet = config.sendStitchedSheet && sources.length > 0
  const total = sources.length + (withSheet ? 1 : 0)
  if (total > STUDIO_MAX_IMAGES) {
    throw new Error(
      `studio 一次最多接收 ${STUDIO_MAX_IMAGES} 张参考图（当前 ${total} 张），请减少附加参考图${withSheet ? '或关闭「附带合成拼图」' : ''}`
    )
  }

  const headers: Record<string, string> = {
    'X-Studio-Wait': String(STUDIO_WAIT_SECONDS),
    'X-Client-Ref': `pose-${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  }

  let res: Response
  if (sources.length) {
    report({ stage: 'upload', message: `正在读取 ${total} 张参考图…` })
    const blobs = await Promise.all(sources.map(srcToBlob))
    if (withSheet) blobs.push(dataUrlToBlob(await stitchRecipeCanvas(recipe)))

    const fd = new FormData()
    fd.append('model', model)
    fd.append('prompt', prompt)
    fd.append('n', '1')
    if (sp.size !== 'auto') fd.append('size', sp.size)
    if (sp.quality !== 'auto') fd.append('quality', sp.quality)
    blobs.forEach((b, i) => {
      fd.append('image[]', b, `ref_${i + 1}.${IMAGE_EXT[b.type] || 'png'}`)
    })
    report({ stage: 'queue', message: '已提交到 studio，等待出图…' })
    res = await fetch(`${STUDIO_API_BASE}/images/edits`, { method: 'POST', headers, body: fd })
  } else {
    const payload: Record<string, any> = { model, prompt, n: 1, response_format: 'b64_json' }
    if (sp.size !== 'auto') payload.size = sp.size
    if (sp.quality !== 'auto') payload.quality = sp.quality
    report({ stage: 'queue', message: '已提交到 studio，等待出图…' })
    res = await fetch(`${STUDIO_API_BASE}/images/generations`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  const json = await readJsonSafe(res)
  let imageUrl: string
  const jobId = res.headers.get('X-Studio-Job-Id')
  if (res.ok) {
    const parsed = extractImage(json)
    if (!parsed) throw new Error(`[studio] 接口已响应但未解析到图片输出：${JSON.stringify(json).slice(0, 200)}`)
    imageUrl = parsed
  } else if (res.status === 504 && jobId) {
    // 60 秒内没出图：任务在 studio 里继续跑，改为轮询
    report({ stage: 'running', message: 'studio 生成中…（超过 60 秒，转为后台轮询）' })
    imageUrl = await pollStudioJob(jobId, startedAt, report)
  } else {
    throw new Error(`[studio] ${studioErrorText(json, res.status)}`)
  }

  return { imageUrl, modelUsed: model, providerUsed: 'studio' }
}
