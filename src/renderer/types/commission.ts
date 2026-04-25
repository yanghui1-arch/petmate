export interface CommissionRequirement {
    itemId: number
    itemName: string
    itemUrl: string
    count: number
}

export interface Commission {
    id: string
    name: string
    description: string
    imageUrl: string
    deadline: Date
    category: 'holiday' | 'daily'
    requirements: CommissionRequirement[]
    status: 'active' | 'completed' | 'expired'
}
