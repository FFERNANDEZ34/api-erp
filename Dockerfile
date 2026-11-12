# Usamos la imagen oficial de Node 24
FROM node:24-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias e instalamos
COPY package*.json ./
RUN npm install

# Copiamos todo tu código fuente
COPY . .

# Exponemos el puerto
EXPOSE 3000

# Ejecutamos directamente con Node 24 nativo (soporta TypeScript sin configurar nada)
CMD ["npx", "tsx", "src/server.ts"]