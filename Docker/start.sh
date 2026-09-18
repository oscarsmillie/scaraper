#!/bin/bash

set -e

echo "========================================="
echo " African Remote Jobs Scraper"
echo "========================================="
echo "Timezone: $(date +'%Z %z')"
echo "Current time: $(date)"
echo "Next scheduled run:"
echo "-----------------------------------------"

# Show installed cron jobs
crontab -l

echo "-----------------------------------------"
echo "Cron started."

# Run cron in foreground
exec cron -f