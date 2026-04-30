FROM node:22-alpine

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm ci --omit=dev

# Code serveur
COPY server.js ./

# Frontend buildé — public/ doit exister avant de lancer docker build
# (npm run build dans running-order2/, puis cp -r dist/* backend/public/)
COPY public/ ./public/

# Répertoire des données — sera écrasé par le volume au runtime
RUN mkdir -p /app/data/users

VOLUME ["/app/data"]

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
