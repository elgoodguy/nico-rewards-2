import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
} from "@shopify/polaris";
// Icons temporarily removed for build compatibility
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get dashboard statistics
    const [
      totalCustomers,
      totalPointsAwarded,
      totalRedemptions,
      recentTransactions,
      topCustomers
    ] = await Promise.all([
      prisma.customer.count({ where: { shop } }),
      prisma.pointTransaction.aggregate({
        where: { shop, points: { gt: 0 } },
        _sum: { points: true }
      }),
      prisma.redemption.count({ where: { shop } }),
      prisma.pointTransaction.findMany({
        where: { shop },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.customer.findMany({
        where: { shop },
        orderBy: { totalPoints: 'desc' },
        take: 5
      })
    ]);

    return json({
      stats: {
        totalCustomers,
        totalPointsAwarded: totalPointsAwarded._sum.points || 0,
        totalRedemptions,
      },
      recentTransactions,
      topCustomers
    });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return json({
      stats: {
        totalCustomers: 0,
        totalPointsAwarded: 0,
        totalRedemptions: 0,
      },
      recentTransactions: [],
      topCustomers: []
    });
  }
};

export default function Dashboard() {
  const { stats, recentTransactions, topCustomers } = useLoaderData<typeof loader>();

  const StatCard = ({ title, value, badge }: {
    title: string;
    value: string | number;
    badge?: string;
  }) => (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="headingMd">{title}</Text>
        <Text as="p" variant="headingLg">{value.toLocaleString()}</Text>
        {badge && <Badge tone="info">{badge}</Badge>}
      </BlockStack>
    </Card>
  );

  return (
    <Page>
      <TitleBar title="Nico Rewards Dashboard" />
      
      <BlockStack gap="500">
        {/* Statistics Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              badge="Active members"
            />
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <StatCard
              title="Points Awarded"
              value={stats.totalPointsAwarded}
              badge="Lifetime"
            />
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <StatCard
              title="Total Redemptions"
              value={stats.totalRedemptions}
              badge="All time"
            />
          </Layout.Section>
        </Layout>

        {/* Recent Activity & Top Customers */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Recent Activity</Text>
                <BlockStack gap="200">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction: any) => (
                      <InlineStack key={transaction.id} align="space-between">
                        <BlockStack gap="050">
                          <Text as="p" variant="bodyMd">
                            {transaction.customer.firstName} {transaction.customer.lastName}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {transaction.description}
                          </Text>
                        </BlockStack>
                        <Text 
                          as="p" 
                          variant="bodyMd" 
                          tone={transaction.points > 0 ? "success" : "critical"}
                        >
                          {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                        </Text>
                      </InlineStack>
                    ))
                  ) : (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No recent activity
                    </Text>
                  )}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Top Customers 🏆</Text>
                <BlockStack gap="200">
                  {topCustomers.length > 0 ? (
                    topCustomers.map((customer: any, index: number) => (
                      <InlineStack key={customer.id} align="space-between">
                        <BlockStack gap="050">
                          <Text as="p" variant="bodyMd">
                            #{index + 1} {customer.firstName} {customer.lastName}
                          </Text>
                          <Badge tone={
                            customer.membershipTier === 'GOLD' ? 'warning' :
                            customer.membershipTier === 'SILVER' ? 'info' : 'default'
                          }>
                            {customer.membershipTier}
                          </Badge>
                        </BlockStack>
                        <Text as="p" variant="bodyMd" tone="success">
                          {customer.totalPoints} pts
                        </Text>
                      </InlineStack>
                    ))
                  ) : (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No customers yet
                    </Text>
                  )}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Quick Actions */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Quick Setup</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Get started with Nico Rewards by configuring your program settings and installing the widget.
            </Text>
            <InlineStack gap="300">
              <Text as="p" variant="bodyMd">
                1. Configure your membership tiers and rewards in{" "}
                <Text as="span" variant="bodyMd" fontWeight="semibold">Settings</Text>
              </Text>
            </InlineStack>
            <InlineStack gap="300">
              <Text as="p" variant="bodyMd">
                2. Install the Nico Rewards widget in your theme customizer
              </Text>
            </InlineStack>
            <InlineStack gap="300">
              <Text as="p" variant="bodyMd">
                3. View your customers' rewards activity in{" "}
                <Text as="span" variant="bodyMd" fontWeight="semibold">Customers</Text>
              </Text>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
