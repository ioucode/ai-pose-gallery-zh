// codearea 部署：主站已迁到 k3s（deploy/web、chart/pose），出图走集群内 studio；
// 这个 Worker 只经 CF 路由接 pose.codearea.cc/img/*、/thumbs/*，原样返回静态图片。
export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request)
  },
}
