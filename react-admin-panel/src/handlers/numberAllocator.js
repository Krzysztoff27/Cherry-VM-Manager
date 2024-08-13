export default class NumberAllocator {
    constructor() {
        this.freeNumbers = [];
        this.currentMax = 0;
    }

    setCurrent(current){
        this.currentMax = current;
    }

    remove(number) {
        if(number > this.currentMax) return;
        this.freeNumbers.push(number);
        this.freeNumbers.sort((a, b) => a - b);
    }

    getNext() {
        if (this.freeNumbers.length) return this.freeNumbers.shift(); 
        return ++this.currentMax;
    }
}
