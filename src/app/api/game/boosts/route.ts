import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    // Mock boost data - in production, this would fetch from database
    const boosts = [
      {
        id: 'multitap',
        name: 'Multitap',
        description: 'Increase coins per tap',
        icon: '👆',
        type: 'multitap',
        current_level: 1,
        max_level: 10,
        base_cost: 1000,
        cost_multiplier: 1.5,
        effect_per_level: 1
      },
      {
        id: 'energy_limit',
        name: 'Energy Limit',
        description: 'Increase max energy',
        icon: '⚡',
        type: 'energy_limit',
        current_level: 1,
        max_level: 10,
        base_cost: 1500,
        cost_multiplier: 1.6,
        effect_per_level: 100
      },
      {
        id: 'recharging_speed',
        name: 'Recharging Speed',
        description: 'Faster energy recovery',
        icon: '🔋',
        type: 'recharging_speed',
        current_level: 1,
        max_level: 10,
        base_cost: 2000,
        cost_multiplier: 1.7,
        effect_per_level: 0.5
      }
    ];

    return NextResponse.json({ success: true, boosts });
  } catch (error) {
    console.error('Failed to fetch boosts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch boosts' }, { status: 500 });
  }
}
