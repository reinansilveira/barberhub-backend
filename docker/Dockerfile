FROM node:20-slim

WORKDIR /app

# Copia só package.json para cache
COPY package*.json ./
RUN npm install

# Copia todo o código
COPY . .

# Garante permissões
RUN chmod -R 777 /app

# Gera Prisma Client
RUN npx prisma generate

# Compila TS para JS dentro do container (build limpo)
RUN npx tsc -p tsconfig.build.json

# Verifica se o dist/main.js existe
RUN ls -la dist

CMD ["node", "dist/main.js"]
