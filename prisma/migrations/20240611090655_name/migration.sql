/*
  Warnings:

  - Added the required column `type` to the `Cache` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CacheType" AS ENUM ('PIN', 'RELOADLY');

-- AlterTable
ALTER TABLE "Cache" ADD COLUMN     "type" "CacheType" NOT NULL;
