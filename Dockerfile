FROM jimmidyson/caddy:v0.9.5
MAINTAINER Red Hat iPaaS <ipaas-dev@redhat.com>

COPY Caddyfile /etc/Caddyfile
COPY dist /srv
