import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding default configurations...')
  
  // Create default membership tiers for demo
  const defaultTiers = [
    {
      name: 'Bronze',
      shop: 'demo.myshopify.com',
      cashbackRate: 0.01, // 1%
      minSpent: 0,
      color: '#CD7F32'
    },
    {
      name: 'Silver', 
      shop: 'demo.myshopify.com',
      cashbackRate: 0.02, // 2%
      minSpent: 500,
      color: '#C0C0C0'
    },
    {
      name: 'Gold',
      shop: 'demo.myshopify.com', 
      cashbackRate: 0.03, // 3%
      minSpent: 1000,
      color: '#FFD700'
    }
  ]

  for (const tier of defaultTiers) {
    await prisma.membershipTier.upsert({
      where: {
        name_shop: {
          name: tier.name,
          shop: tier.shop
        }
      },
      update: {},
      create: tier
    })
  }

  // Create default redemption options
  const defaultRedemptions = [
    {
      shop: 'demo.myshopify.com',
      name: '5% Off Order',
      description: 'Get 5% off your next order',
      pointsCost: 500,
      type: 'PERCENTAGE_DISCOUNT' as const,
      value: 5
    },
    {
      shop: 'demo.myshopify.com',
      name: '$10 Off Order',
      description: 'Get $10 off your next order',
      pointsCost: 1000,
      type: 'FIXED_DISCOUNT' as const,
      value: 10
    },
    {
      shop: 'demo.myshopify.com',
      name: 'Free Shipping',
      description: 'Free shipping on your next order',
      pointsCost: 300,
      type: 'FREE_SHIPPING' as const,
      value: 0
    }
  ]

  for (const redemption of defaultRedemptions) {
    await prisma.redemptionOption.create({
      data: redemption
    })
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })