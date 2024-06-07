import { v4 as uuidv4 } from 'uuid'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tierOneConstraintId = uuidv4()
    const tierTwoConstraintId = uuidv4()
    const tierThreeConstraintId = uuidv4()

    await prisma.levelConstraint.upsert({
        where: { id: tierOneConstraintId },
        update: {},
        create: {
            id: tierOneConstraintId,
            maxDailyWithdrawal: 100_000, // 100k
            maxSingleWithdrawal: 50_000, // 50k
        },
    })

    await prisma.levelConstraint.upsert({
        where: { id: tierTwoConstraintId },
        update: {},
        create: {
            id: tierTwoConstraintId,
            maxDailyWithdrawal: 1_000_000, // 1 Million
            maxSingleWithdrawal: 200_000, // 200k
        },
    })

    await prisma.levelConstraint.upsert({
        where: { id: tierThreeConstraintId },
        update: {},
        create: {
            id: tierThreeConstraintId,
            maxDailyWithdrawal: 1e9, // 1 Billion - unlimited
            maxSingleWithdrawal: 500_000, // 500k
        },
    })

    await prisma.level.upsert({
        where: { name: 'TIER_1' },
        update: {},
        create: {
            id: uuidv4(),
            name: 'TIER_1',
            constraintId: tierOneConstraintId,
        },
    })

    await prisma.level.upsert({
        where: { name: 'TIER_2' },
        update: {},
        create: {
            id: uuidv4(),
            name: 'TIER_2',
            constraintId: tierTwoConstraintId,
        },
    })

    await prisma.level.upsert({
        where: { name: 'TIER_3' },
        update: {},
        create: {
            id: uuidv4(),
            name: 'TIER_3',
            constraintId: tierThreeConstraintId,
        },
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
