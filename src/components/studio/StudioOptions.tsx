import { SelectItem } from '@/components/ui/select'

// studio 出图参数的下拉选项（合成台与出图设置页共用）
export function StudioSizeItems() {
  return (
    <>
      <SelectItem value="2:3">2:3（竖版）</SelectItem>
      <SelectItem value="3:4">3:4</SelectItem>
      <SelectItem value="9:16">9:16</SelectItem>
      <SelectItem value="1:1">1:1</SelectItem>
      <SelectItem value="4:3">4:3</SelectItem>
      <SelectItem value="3:2">3:2</SelectItem>
      <SelectItem value="16:9">16:9</SelectItem>
      <SelectItem value="auto">auto（由模型决定）</SelectItem>
    </>
  )
}

export function StudioQualityItems() {
  return (
    <>
      <SelectItem value="auto">auto</SelectItem>
      <SelectItem value="high">high</SelectItem>
      <SelectItem value="medium">medium</SelectItem>
      <SelectItem value="low">low</SelectItem>
    </>
  )
}
