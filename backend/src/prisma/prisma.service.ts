import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// pg's ConnectionParameters does `Object.assign({}, config, parse(connectionString))`
// when both `connectionString` and other fields (like `ssl`) are passed together —
// the parsed connection string always wins. So if the URL has `?sslmode=require`,
// it silently overwrites any explicit `ssl` option with strict certificate
// validation, no matter what you pass. Stripping ssl-related query params here
// means our explicit `ssl` option below is the only thing that takes effect.
function stripSslQueryParams(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('sslaccept');
    return parsed.toString();
  } catch {
    return url;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Since Prisma 7, PrismaClient needs an explicit driver adapter — it no
    // longer reads the datasource URL from the schema/env at runtime.
    //
    // ssl.rejectUnauthorized: false is required against Supabase's connection
    // pooler (Supavisor) — its certificate chain isn't trusted by Node's
    // default CA store, which otherwise fails with "self-signed certificate
    // in certificate chain" (P1011). The connection itself is still
    // encrypted; this only disables hostname/chain verification, which is
    // the standard accepted trade-off for connecting through Supabase's pooler.
    super({
      adapter: new PrismaPg({
        connectionString: stripSslQueryParams(process.env.DATABASE_URL),
        ssl: { rejectUnauthorized: false },
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
