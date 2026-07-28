# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore
WORKDIR /src

COPY global.json ./
COPY PersonalFinanceOS.sln ./
COPY backend/PersonalFinance.sln backend/
COPY backend/src/PersonalFinance.Domain/PersonalFinance.Domain.csproj backend/src/PersonalFinance.Domain/
COPY backend/src/PersonalFinance.Application/PersonalFinance.Application.csproj backend/src/PersonalFinance.Application/
COPY backend/src/PersonalFinance.Infrastructure/PersonalFinance.Infrastructure.csproj backend/src/PersonalFinance.Infrastructure/
COPY backend/src/PersonalFinance.Api/PersonalFinance.Api.csproj backend/src/PersonalFinance.Api/

RUN dotnet restore backend/src/PersonalFinance.Api/PersonalFinance.Api.csproj

FROM restore AS publish
COPY backend/src backend/src
RUN dotnet publish backend/src/PersonalFinance.Api/PersonalFinance.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PersonalFinance.Api.dll"]
