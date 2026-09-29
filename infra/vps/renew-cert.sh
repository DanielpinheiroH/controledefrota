#!/bin/bash
set -euo pipefail
certbot renew --quiet --config-dir /opt/frotasguest/certificates --work-dir /opt/frotasguest/certbot-work --logs-dir /opt/frotasguest/logs/certbot --deploy-hook 'nginx -t && systemctl reload nginx'
