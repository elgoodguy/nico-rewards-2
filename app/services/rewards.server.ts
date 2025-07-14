import type { TierLevel } from "@prisma/client";
import prisma from "../db.server";

export class RewardsService {
  private shop: string;

  constructor(shop: string) {
    this.shop = shop;
  }

  // Get or create a customer in our rewards system
  async getOrCreateCustomer(shopifyCustomerId: string, customerData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }) {
    let customer = await prisma.customer.findUnique({
      where: {
        shopifyCustomerId_shop: {
          shopifyCustomerId,
          shop: this.shop
        }
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!customer && customerData) {
      customer = await prisma.customer.create({
        data: {
          shopifyCustomerId,
          shop: this.shop,
          email: customerData.email,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          totalPoints: 0,
          totalSpent: 0,
          membershipTier: 'BRONZE' as const
        },
        include: {
          transactions: true
        }
      });

      // Give welcome bonus
      if (customer) {
        await this.addWelcomeBonus(customer.id);
        // Refresh customer data to include the welcome bonus transaction
        customer = await prisma.customer.findUnique({
          where: { id: customer.id },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        });
      }
    }

    return customer;
  }

  // Add points for a purchase
  async addPointsForPurchase(customerId: string, orderId: string, amount: number) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) return null;

    // Get cashback rate for customer tier
    const cashbackRate = await this.getCashbackRateForTier(customer.membershipTier);
    const pointsEarned = Math.floor(amount * cashbackRate * 100); // Convert to points (1 dollar = 100 points base)

    // Create transaction
    const transaction = await prisma.pointTransaction.create({
      data: {
        customerId,
        shop: this.shop,
        points: pointsEarned,
        type: 'EARNED_PURCHASE',
        orderId,
        amount,
        description: `Purchase cashback: ${(cashbackRate * 100).toFixed(1)}%`
      }
    });

    // Update customer totals
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: { increment: pointsEarned },
        totalSpent: { increment: amount }
      }
    });

    // Check if tier upgrade is needed
    await this.updateCustomerTier(customerId);

    return { transaction, customer: updatedCustomer, pointsEarned };
  }

  // Get cashback rate for tier
  async getCashbackRateForTier(tier: TierLevel): Promise<number> {
    const tiers = await prisma.membershipTier.findMany({
      where: { shop: this.shop },
      orderBy: { minSpent: 'asc' }
    });

    const tierConfig = tiers.find(t => t.name.toUpperCase() === tier);
    return tierConfig?.cashbackRate || 0.01; // Default 1%
  }

  // Update customer tier based on total spent
  async updateCustomerTier(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) return null;

    const tiers = await prisma.membershipTier.findMany({
      where: { shop: this.shop },
      orderBy: { minSpent: 'desc' }
    });

    let newTier: TierLevel = 'BRONZE';
    for (const tier of tiers) {
      if (customer.totalSpent >= tier.minSpent) {
        newTier = tier.name.toUpperCase() as TierLevel;
        break;
      }
    }

    if (newTier !== customer.membershipTier) {
      return await prisma.customer.update({
        where: { id: customerId },
        data: { membershipTier: newTier }
      });
    }

    return customer;
  }

  // Add welcome bonus
  async addWelcomeBonus(customerId: string) {
    const config = await this.getAppConfig();
    
    await prisma.pointTransaction.create({
      data: {
        customerId,
        shop: this.shop,
        points: config.welcomeBonus,
        type: 'EARNED_SIGNUP',
        description: 'Welcome bonus'
      }
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: { increment: config.welcomeBonus }
      }
    });
  }

  // Get customer rewards summary
  async getCustomerSummary(shopifyCustomerId: string) {
    const customer = await prisma.customer.findUnique({
      where: {
        shopifyCustomerId_shop: {
          shopifyCustomerId,
          shop: this.shop
        }
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        redemptions: {
          where: { status: 'PENDING' },
          include: { option: true }
        }
      }
    });

    if (!customer) return null;

    // Get available redemption options
    const redemptionOptions = await prisma.redemptionOption.findMany({
      where: {
        shop: this.shop,
        isActive: true,
        pointsCost: { lte: customer.totalPoints }
      },
      orderBy: { pointsCost: 'asc' }
    });

    // Get tier progression
    const tiers = await prisma.membershipTier.findMany({
      where: { shop: this.shop },
      orderBy: { minSpent: 'asc' }
    });

    const currentTierIndex = tiers.findIndex(t => 
      t.name.toUpperCase() === customer.membershipTier
    );
    const nextTier = tiers[currentTierIndex + 1];

    return {
      customer,
      availableRedemptions: redemptionOptions,
      tierProgression: {
        current: tiers[currentTierIndex],
        next: nextTier,
        progressToNext: nextTier ? 
          ((customer.totalSpent - tiers[currentTierIndex]?.minSpent || 0) / 
           (nextTier.minSpent - (tiers[currentTierIndex]?.minSpent || 0))) * 100 
          : 100
      }
    };
  }

  // Get app configuration
  async getAppConfig() {
    let config = await prisma.appConfig.findUnique({
      where: { shop: this.shop }
    });

    if (!config) {
      config = await prisma.appConfig.create({
        data: { shop: this.shop }
      });
    }

    return config;
  }

  // Redeem points
  async redeemPoints(customerId: string, optionId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    const option = await prisma.redemptionOption.findUnique({
      where: { id: optionId }
    });

    if (!customer || !option || customer.totalPoints < option.pointsCost) {
      throw new Error('Invalid redemption request');
    }

    // Create redemption record
    const redemption = await prisma.redemption.create({
      data: {
        customerId,
        shop: this.shop,
        optionId,
        pointsSpent: option.pointsCost,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    // Deduct points
    await prisma.pointTransaction.create({
      data: {
        customerId,
        shop: this.shop,
        points: -option.pointsCost,
        type: 'REDEEMED',
        description: `Redeemed: ${option.name}`
      }
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalPoints: { decrement: option.pointsCost }
      }
    });

    return redemption;
  }
}