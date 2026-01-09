
import { manifestService } from './src/services/manifest-service'
import { weaponParser } from './src/services/weapon-parser'
import fs from 'fs'

async function run() {
    console.log("Initializing Manifest...")
    await manifestService.init()
    console.log("Manifest Initialized.")

    const weaponHash = 1051949956 // Anonymous Autumn
    const weaponDef = manifestService.getInventoryItem(weaponHash)

    if (!weaponDef) {
        console.error("Weapon definition not found!")
        return
    }

    console.log(`Found Weapon: ${weaponDef.displayProperties.name}`)

    const socketData = weaponDef.sockets
    if (!socketData) {
        console.log("No sockets found")
        return
    }

    const results = []

    // Iterate sockets to find perk columns
    // Standard Lightweight Sidearm layout
    // Col 0: Intrinsic (Frame) - usually socket 0
    // Col 1: Barrel - usually socket 1
    // Col 2: Magazine - usually socket 2
    // Col 3: Trait 1 - usually socket 3
    // Col 4: Trait 2 - usually socket 4
    // Col 5: Origin - usually socket 5
    // Col 6: Masterwork? 

    // Let's just dump all sockets that look like they have reusable plugs
    for (let i = 0; i < socketData.socketEntries.length; i++) {
        const entry = socketData.socketEntries[i]
        const plugSetHash = entry.reusablePlugSetHash || entry.randomizedPlugSetHash

        if (plugSetHash) {
            const plugSet = manifestService.getPlugSet(plugSetHash)
            if (!plugSet) continue

            const columnPerks = []
            for (const item of plugSet.reusablePlugItems) {
                const perkDef = manifestService.getInventoryItem(item.plugItemHash)
                if (!perkDef) continue
                columnPerks.push({
                    id: item.plugItemHash,
                    name: perkDef.displayProperties.name,
                    icon: perkDef.displayProperties.icon,
                    type: perkDef.itemTypeDisplayName

                })
            }
            results.push({
                socketIndex: i,
                type: columnPerks[0]?.type,
                perks: columnPerks
            })
        }
    }

    console.log(JSON.stringify(results, null, 2))
}

run().catch(console.error)
