#!/bin/sh

# Fetch the public IP address dynamically
echo "🔍 [START] Fetching public IP..."
export PUBLIC_IP=$(curl -s --connect-timeout 5 https://api.ipify.org || curl -s --connect-timeout 5 https://ifconfig.me)
echo "🔍 [START] Public IP detected: $PUBLIC_IP"

# If public IP couldn't be fetched, fallback
if [ -z "$PUBLIC_IP" ]; then
  echo "⚠️ [START] Warning: Could not detect public IP. Falling back to 127.0.0.1"
  export PUBLIC_IP="127.0.0.1"
fi

# Write coturn configuration
cat <<EOF > /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=$PUBLIC_IP
fingerprint
lt-cred-mech
user=chatuser:chatpassword123
realm=chat.app
simple-log
EOF

echo "🚀 [START] Starting Coturn TURN Server in background..."
# Run TURN server in background
turnserver -c /etc/turnserver.conf &

echo "🚀 [START] Starting Node application..."
# Run Node Server
exec npm start
