# pose 集群版 web 镜像：非 root nginx + 站点静态文件（不含 img/、thumbs/，那两类由 CF Worker 提供）。
# 构建上下文由 CI 组装（.github/workflows/codearea.yml）：
#   html/                    dist/ 去掉 img/、thumbs/、_headers
#   default.conf.template    本目录的 nginx 模板
# 基础镜像与 peach 的 nginx 边车同一个（版本 tag + digest，手动升级）。
FROM docker.io/nginxinc/nginx-unprivileged:1.29-alpine@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6

USER root
# 去掉镜像自带的 default.conf
RUN rm -f /etc/nginx/conf.d/default.conf
USER 101

# 15-local-resolvers.envsh 把 /etc/resolv.conf 里的 DNS 写进 NGINX_LOCAL_RESOLVERS；
# envsubst 只替换下面这些变量，避免误伤 nginx 自己的 $变量
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER='^(STUDIO_IMAGE_API_KEY|STUDIO_UPSTREAM|NGINX_LOCAL_RESOLVERS)$' \
    STUDIO_UPSTREAM=http://studio.apps.svc.cluster.local:80

COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY html /usr/share/nginx/html

EXPOSE 8080
