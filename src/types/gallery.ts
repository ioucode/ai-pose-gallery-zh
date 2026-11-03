export interface PoseItem {
  source?: 'upload'
  /** 是否使用灰阶深度图（Depth Map）代替素体白模 */
  useDepth?: boolean
  id: string
  体系: string
  姿势编号: string
  分类: string
  姿势名称: string
  角度: string
  缩略图: string
  原图: string
  检索: string
}

export interface PoseGroup {
  key: string
  system: string
  number: string
  name: string
  category: string
  items: PoseItem[]
  angles: Record<string, PoseItem>
  order: PoseItem[]
}

export interface CostumeItem {
  source?: 'upload'
  id: string
  分类: string
  服装名称: string
  标签: string[]
  关键词: string
  缩略图: string
  预览图: string
  原图: string
  检索: string
}

export interface PortraitItem {
  source?: 'upload'
  id: string
  分区: string
  发长: string
  发型名称: string
  标题: string
  宽: number
  高: number
  字节数: number
  精选: boolean
  热门: boolean
  缩略图: string
  原图: string
  检索: string
}

export interface ExtraReferenceImage {
  id: string
  name: string
  url: string
}

export interface RecipeState {
  portrait: PortraitItem | null
  costume: CostumeItem | null
  pose: PoseItem | null
  extraImages?: ExtraReferenceImage[]
}

/** 出图统一走集群内 studio（同源 /api/studio/v1，OpenAI 兼容接口，令牌在服务端注入） */
export interface StudioParams {
  /** studio 的逻辑模型 ID，列表从 GET /api/studio/v1/models 动态获取 */
  model: string
  /** studio 接受比例串（2:3、16:9…）或像素尺寸；auto 表示不传 */
  size: 'auto' | '2:3' | '3:4' | '1:1' | '4:3' | '3:2' | '9:16' | '16:9'
  quality: 'auto' | 'low' | 'medium' | 'high'
}

export interface ApiConfig {
  /** 配置结构版本：v4 起只剩 studio，旧版各厂商配置一律丢弃 */
  configVersion: number
  stylePreset: string
  /** 额外附带一张参考拼图（占 studio 4 张参考图名额中的 1 张） */
  sendStitchedSheet: boolean
  studioParams: StudioParams
}

export interface GenerationHistoryItem {
  id: string
  createdAt: number
  /** 旧版记录可能是 gemini / gpt 等，仅作展示 */
  provider: string
  model: string
  prompt: string
  imageUrl: string
  recipeSummary: string
}
