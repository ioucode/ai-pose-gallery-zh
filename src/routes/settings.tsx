import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RotateCcwIcon, SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Field, Section } from '@/components/common/FormSection'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { StudioQualityItems, StudioSizeItems } from '@/components/studio/StudioOptions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEFAULT_STUDIO_MODEL, studioModelsQuery } from '@/services/aiGenerator'
import { useStudio } from '@/store/studioStore'
import type { StudioParams } from '@/types/gallery'

export const Route = createFileRoute('/settings')({
  staticData: { title: '出图设置' },
  component: SettingsPage,
})

function SettingsPage() {
  const { apiConfig, updateStudioParams } = useStudio()
  const sp = apiConfig.studioParams
  const models = useQuery(studioModelsQuery)
  // 已选模型不在列表里（studio 侧下线 / 列表拉取失败）时也显示出来，避免下拉框空白
  const modelOptions = Array.from(new Set([...(models.data ?? [DEFAULT_STUDIO_MODEL]), sp.model]))

  return (
    <>
      <PageHeader
        title="出图设置"
        actions={
          <Button size="sm" asChild>
            <Link to="/studio">
              <SparklesIcon className="size-4" />
              返回合成台
            </Link>
          </Button>
        }
      />

      <Section
        title="站内 studio"
        desc="出图由站内 studio 提供（本站服务端转发到集群内 studio 生图总入口），无需填写地址或 API Key。单次最多 4 张参考图，超过 60 秒自动转为后台轮询（最长约 10 分钟）。"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              updateStudioParams({ model: DEFAULT_STUDIO_MODEL, size: '2:3', quality: 'auto' })
              toast.success('已恢复默认')
            }}
          >
            <RotateCcwIcon className="size-3.5" />
            重置
          </Button>
        }
      >
        <Field
          label="模型"
          hint={models.isError ? '模型列表获取失败，仅显示默认模型；可稍后刷新重试' : '列表来自 studio，可用模型由 studio 侧统一管理'}
        >
          <Select value={sp.model} onValueChange={(v) => updateStudioParams({ model: v })}>
            <SelectTrigger className="w-full font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m} value={m} className="font-mono text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="画面比例 (size)">
          <Select value={sp.size} onValueChange={(v) => updateStudioParams({ size: v as StudioParams['size'] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <StudioSizeItems />
            </SelectContent>
          </Select>
        </Field>

        <Field label="画质 (quality)">
          <Select value={sp.quality} onValueChange={(v) => updateStudioParams({ quality: v as StudioParams['quality'] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <StudioQualityItems />
            </SelectContent>
          </Select>
        </Field>
      </Section>
    </>
  )
}
