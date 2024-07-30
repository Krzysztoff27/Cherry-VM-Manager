export default class NumberAllocator {
    constructor() {
        this.usedNumbers = new Set();
        this.freeNumbers = [];
        this.currentMax = 0;
    }

    add(number) {
        this.usedNumbers.add(number);
    }

    remove(number) {
        console.log(number)
        if (this.usedNumbers.has(number)) {
            this.usedNumbers.delete(number);
            this.freeNumbers.push(number);
            this.freeNumbers.sort((a, b) => a - b); // Keep free numbers sorted
        }
    }

    getNext() {
        if (this.freeNumbers.length > 0) return this.freeNumbers.shift(); // Get the smallest available number;
        this.add(++this.currentMax);
        return this.currentMax;
    }
}
