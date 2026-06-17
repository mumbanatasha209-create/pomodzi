FROM rust:1.83-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src

RUN cargo build --release --bin pamodzi-backend

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/pamodzi-backend /app/pamodzi-backend
COPY migrations ./migrations

ENV SERVER_ADDR=0.0.0.0:8080
EXPOSE 8080

CMD ["/app/pamodzi-backend"]
