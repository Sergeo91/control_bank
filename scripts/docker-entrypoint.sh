#!/bin/sh

echo "⏳ Attente de la base de données..."
# Attendre que PostgreSQL soit prêt
# D'abord vérifier que le serveur PostgreSQL répond
until pg_isready -h db -U mission_banque_user > /dev/null 2>&1; do
  echo "⏳ En attente de PostgreSQL..."
  sleep 2
done

# Ensuite vérifier que la base de données existe et est accessible
until pg_isready -h db -U mission_banque_user -d mission_banque_db > /dev/null 2>&1; do
  echo "⏳ En attente que la base de données soit prête..."
  sleep 2
done

echo "✅ Base de données prête!"

# Exécuter les migrations
echo "🔄 Exécution des migrations..."
npm run migrate || echo "⚠️  Migrations déjà exécutées ou erreur (non bloquant)"

# Exécuter le seed
echo "🌱 Exécution du seed..."
npm run seed || echo "⚠️  Seed déjà exécuté ou erreur (non bloquant)"

echo "✅ Initialisation terminée!"

# Détecter et afficher l'adresse IP du réseau local
echo ""
echo "🌐 Détection de l'adresse IP du réseau local..."

# Obtenir l'IP de l'hôte
APP_IP=""

# Méthode 1: Variable d'environnement (priorité)
if [ -n "$HOST_IP" ]; then
  APP_IP="$HOST_IP"
  echo "   ✓ IP définie via HOST_IP: $APP_IP"
# Méthode 2: Sur Windows avec Docker Desktop, obtenir l'IP réelle de l'hôte
elif command -v getent >/dev/null 2>&1; then
  # Essayer de se connecter à l'hôte et obtenir son IP réelle
  # Sur Windows Docker Desktop, on peut utiliser la route par défaut
  if command -v ip >/dev/null 2>&1; then
    # Obtenir l'IP de la passerelle (qui est l'hôte Docker)
    GATEWAY_IP=$(ip route | grep default | awk '{print $3}' | head -1)
    if [ -n "$GATEWAY_IP" ]; then
      # Sur Windows Docker Desktop, la passerelle n'est pas l'IP réelle
      # On va essayer de ping l'hôte et voir sa réponse
      APP_IP="$GATEWAY_IP"
    fi
  fi
  
  # Essayer host.docker.internal mais filtrer les IPs Docker internes
  DOCKER_HOST_IP=$(getent hosts host.docker.internal 2>/dev/null | awk '{ print $1 }' || echo "")
  if [ -n "$DOCKER_HOST_IP" ] && [ "$DOCKER_HOST_IP" != "192.168.65.254" ] && [ "$DOCKER_HOST_IP" != "192.168.65.1" ]; then
    APP_IP="$DOCKER_HOST_IP"
  fi
fi

# Méthode 3: Sur Linux natif, utiliser ip route
if [ -z "$APP_IP" ] && command -v ip >/dev/null 2>&1; then
  APP_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' | head -1 || echo "")
fi

# Méthode 4: Utiliser hostname
if [ -z "$APP_IP" ] && command -v hostname >/dev/null 2>&1; then
  APP_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
fi

# Filtrer les IPs Docker internes connues
if [ "$APP_IP" = "192.168.65.254" ] || [ "$APP_IP" = "192.168.65.1" ] || [ "$APP_IP" = "172.17.0.1" ]; then
  APP_IP=""
fi

# Afficher les informations de connexion
echo "📱 Application accessible sur :"
echo "   - Local:    http://localhost:3000"
if [ -n "$APP_IP" ] && [ "$APP_IP" != "127.0.0.1" ] && [ "$APP_IP" != "localhost" ]; then
  echo "   - Réseau:   http://$APP_IP:3000"
else
  echo "   - Réseau:   http://VOTRE_IP_LOCALE:3000"
  echo ""
  echo "   💡 Pour définir votre IP manuellement, ajoutez dans docker-compose.dev.yml :"
  echo "      environment:"
  echo "        HOST_IP: 192.168.1.65"
  echo ""
  echo "   📋 Trouvez votre IP avec:"
  echo "      Windows: ipconfig | findstr IPv4"
  echo "      Mac/Linux: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
fi
echo ""

# Exécuter la commande passée en paramètre (généralement npm install && npm run dev)
exec "$@"
