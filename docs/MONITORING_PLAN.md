# Giám sát & Logging

## 1. Log rotation (VM Debian)
```bash
sudo tee /etc/logrotate.d/duthi-backend <<'EOF'
/home/Admin/duthithptlaivung1find/backend/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```
- Lưu log vào `backend/logs/` (Uvicorn `--log-config` hoặc `--log-file`).

## 2. Cloud Logging (tuỳ chọn)
```bash
sudo apt install google-fluentd
sudo service google-fluentd start
```
- Cấu hình `/etc/google-fluentd/config.d/duthi-backend.conf` để forward `journalctl`.

## 3. Theo dõi định kỳ
- Script `deploy_backend.py --health` (cron 15 phút):
  ```bash
  */15 * * * * cd /home/Admin/duthithptlaivung1find && \
    source backend/venv/bin/activate && \
    python deploy_backend.py --health >> /var/log/duthi-health.log 2>&1
  ```
- CPU/RAM/đĩa: `python deploy_backend.py --check-resources`
- Process/port: `python deploy_backend.py --check-process`

## 4. Alert thủ công
- Nếu `--health` fail, restart service:
  ```bash
  python deploy_backend.py -r --health
  ```
- Ghi lại sự cố trong nhật ký vận hành.

