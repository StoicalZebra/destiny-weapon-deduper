export interface WeaponInstance {
  itemInstanceId: string
  itemHash: number // Links to DestinyInventoryItemDefinition
  sockets: {
    sockets: SocketInstance[]
  }
  socketPlugsByIndex?: Record<number, number[]>
  // Gear tier (1-5 stars) - null/undefined for items obtained before Episode Heresy (9.0.0)
  gearTier?: number | null
}

export interface SocketInstance {
  plugHash: number // Currently equipped perk
  isEnabled: boolean
}
