# 导师辅导能力自评系统 - CloudBase 云托管镜像
# 单端口（3000）托管用户端 + Express API
FROM node:22.5.1-bullseye

WORKDIR /app

# 先装依赖（利用层缓存）
COPY package.json package-lock.json* ./
RUN npm install

COPY server/package.json server/package-lock.json* ./server/
RUN npm --prefix server install

# 拷贝源码并构建前端
COPY . .
RUN npm run build:all

ENV SERVE_DIST=true \
    DB_PATH=/data/mentor.db \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=Admin@2026

EXPOSE 3000

# 云托管会注入 PORT 环境变量，监听 0.0.0.0:$PORT
CMD ["node", "--experimental-sqlite", "server/src/cloudbase-entry.js"]
