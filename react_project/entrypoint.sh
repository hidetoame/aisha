#!/bin/sh

# PORT環境変数をnginx設定に適用
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# nginxを起動
exec nginx -g 'daemon off;'