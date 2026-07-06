# This script stops the docker containers, deletes the old PostgreSQL volume to clear out old passwords/data, and starts them again.
docker-compose down -v
docker-compose up -d
