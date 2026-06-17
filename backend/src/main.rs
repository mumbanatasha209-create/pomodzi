#[tokio::main]
async fn main() -> anyhow::Result<()> {
    pamodzi_backend::run().await
}
