/**
 * Utility to migrate data from the old Hellfest Running Order version to the new one.
 */

export const migrateOldData = (oldState) => {
    if (!oldState) return null;

    // Check if it's already in the new format (has interestColors or complex taggedBands)
    // If it looks like the old format (flat taggedBands with "color1", "color2"...), migrate it.

    const newState = { ...oldState };

    // 1. Migrate Colors (color1/2/3 -> interestColors)
    if (oldState.color1 || oldState.color2 || oldState.color3) {
        newState.interestColors = {
            must_see: oldState.color1 || "#FFEC61",
            interested: oldState.color2 || "#8AFF61",
            curious: oldState.color3 || "#61D6FF"
        };
        // We can keep color1/2/3 for a while if needed, but it's cleaner to remove them later
    }

    // 2. Migrate Tagged Bands (Favorites)
    if (oldState.taggedBands) {
        const newTaggedBands = {};
        Object.entries(oldState.taggedBands).forEach(([id, value]) => {
            // Check if value is one of the old color keys
            if (value === 'color1' || value === 'must_see') {
                newTaggedBands[id] = { interest: 'must_see', context: null, taggedAt: Date.now() };
            } else if (value === 'color2' || value === 'interested') {
                newTaggedBands[id] = { interest: 'interested', context: null, taggedAt: Date.now() };
            } else if (value === 'color3' || value === 'curious') {
                newTaggedBands[id] = { interest: 'curious', context: null, taggedAt: Date.now() };
            } else if (typeof value === 'object' && value !== null) {
                // Already in new format or partially migrated
                newTaggedBands[id] = value;
            } else {
                // Fallback for any other string value (default to curious or ignore)
                newTaggedBands[id] = { interest: 'curious', context: null, taggedAt: Date.now() };
            }
        });
        newState.taggedBands = newTaggedBands;
    }

    // 3. Notes are already in the correct format (Map of id -> string)
    // No explicit changes needed unless we want to filter empty notes.
    if (oldState.notes) {
        newState.notes = { ...oldState.notes };
    }

    // Mark as migrated to avoid repeated heavy processing (optional)
    newState.version = '2.0';

    return newState;
};
