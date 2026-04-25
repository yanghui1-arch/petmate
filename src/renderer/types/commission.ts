export interface CommissionRequirement {
    itemId: number
    itemName: string
    itemUrl: string
    count: number
}

export interface CommissionRewardPreview {
    id: string
    type: 'cash' | 'item' | 'animation' | 'title'
    name: string
    description: string
    imageUrl?: string
    count?: number
    amount?: number
}

export interface Commission {
    id: string
    name: string
    description: string
    imageUrl: string
    deadline: Date
    category: 'holiday' | 'daily'
    requirements: CommissionRequirement[]
    rewards: CommissionRewardPreview[]
    status: 'active' | 'completed' | 'expired'
}
