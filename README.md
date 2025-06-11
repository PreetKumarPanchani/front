This project uses [Next.js](https://nextjs.org/).

## Run

```bash
npm install
# install dependencies

npm run dev
# run dev server

npm run build
# build server
npm run start
# run server
```

## Environment variables

There are two ways of connecting to the database `postgresql://postgres:password@localhost:5432/sales_db`:

- Use the connection string `DB_URL=postgresql://postgres:password@localhost:5432/sales_db`
- Use the full data:
  - `DB_HOST=localhost`
  - `DB_PORT=5432`
  - `DB_NAME=sales_db`
  - `DB_USERNAME=postgres`
  - `DB_PASSWORD=password`

If `DB_URL` is specified in environment variables then that will be used, else the full data will be used.

If `RUN_CONTEXT=local` is specified, then the db will connect to a local instance rather than RDS (i.e. it will not try to use SSL to connect).

<!-- Maybe rename RUN_CONTEXT to DB_CONTEXT -->

## Deploy

This app is configured to work with AWS Amplify. Amplify will automatically run the commands given in [amplify.yml](./amplify.yml) when code is pushed to the main branch of this repository. Amplify's only additional configuration required is the environment variables.
