FROM maven:3.9.9-eclipse-temurin-22 AS build
WORKDIR /workspace

COPY pom.xml ./
COPY mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

COPY src ./src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:22-jre
WORKDIR /app

COPY --from=build /workspace/target/*.jar /app/app.jar

EXPOSE 8080

ENV DB_URL=jdbc:postgresql://postgres:5432/botdb
ENV DB_USERNAME=postgres
ENV DB_PASSWORD=password
ENV GEMINI_API_KEY=

ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --spring.datasource.url=${DB_URL} --spring.datasource.username=${DB_USERNAME} --spring.datasource.password=${DB_PASSWORD} --gemini.api.key=${GEMINI_API_KEY}"]
