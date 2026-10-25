# Build frontend
FROM node:20 AS frontend
WORKDIR /app/bot-front
COPY bot-front/package*.json ./
RUN npm ci
COPY bot-front ./
RUN npm run build

# Build backend
FROM maven:3.9.9-eclipse-temurin-22 AS backend
WORKDIR /app/bot-back
COPY bot-back/pom.xml ./
COPY bot-back/mvnw ./
COPY bot-back/.mvn .mvn
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY bot-back/src ./src
# copy frontend build into static
COPY --from=frontend /app/bot-front/dist ./src/main/resources/static
RUN ./mvnw -q -DskipTests package

# Run
FROM eclipse-temurin:22-jre
WORKDIR /app
COPY --from=backend /app/bot-back/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
