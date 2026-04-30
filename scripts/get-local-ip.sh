#!/bin/sh
# Script pour obtenir l'adresse IP locale de l'hôte

# Sur Windows avec Docker Desktop, utiliser host.docker.internal
if command -v getent >/dev/null 2>&1; then
  IP=$(getent hosts host.docker.internal 2>/dev/null | awk '{ print $1 }')
  if [ -n "$IP" ]; then
    echo "$IP"
    exit 0
  fi
fi

# Sur Linux, essayer de trouver l'IP de l'interface réseau principale
if command -v ip >/dev/null 2>&1; then
  # Obtenir l'IP de l'interface par défaut (pas lo)
  IP=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7}' | head -1)
  if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ]; then
    echo "$IP"
    exit 0
  fi
fi

# Fallback: utiliser hostname -I
if command -v hostname >/dev/null 2>&1; then
  IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [ -n "$IP" ] && [ "$IP" != "127.0.0.1" ]; then
    echo "$IP"
    exit 0
  fi
fi

# Dernier recours: afficher un message
echo "localhost"

