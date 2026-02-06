export const migrateOldData = (oldState) => {
    if (!oldState) return null;

    const newState = { ...oldState };

    if (oldState.color1 || oldState.color2 || oldState.color3) {
        newState.interestColors = {
            must_see: oldState.color1 || "#FFEC61",
            interested: oldState.color2 || "#8AFF61",
            curious: oldState.color3 || "#61D6FF"
        };
    }

    if (oldState.taggedBands) {
        const newTaggedBands = {};
        Object.entries(oldState.taggedBands).forEach(([id, value]) => {
            if (value === 'color1' || value === 'must_see') {
                newTaggedBands[id] = { interest: 'must_see', context: null, taggedAt: Date.now() };
            } else if (value === 'color2' || value === 'interested') {
                newTaggedBands[id] = { interest: 'interested', context: null, taggedAt: Date.now() };
            } else if (value === 'color3' || value === 'curious') {
                newTaggedBands[id] = { interest: 'curious', context: null, taggedAt: Date.now() };
            } else if (typeof value === 'object' && value !== null) {
                newTaggedBands[id] = value;
            } else {
                newTaggedBands[id] = { interest: 'curious', context: null, taggedAt: Date.now() };
            }
        });
        newState.taggedBands = newTaggedBands;
    }

    if (oldState.notes) {
        newState.notes = { ...oldState.notes };
    }

    newState.version = '2.0';

    return newState;
};
