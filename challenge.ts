async function sleep(ms: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    });
}

async function randomDelay() {
    const randomTime = Math.round(Math.random() * 1000);
    return sleep(randomTime);
}

class ShipmentSearchIndex {
    async updateShipment(id: string, shipmentData: any) {
        const startTime = new Date();
        await randomDelay();
        const endTime = new Date();
        console.log(
            `update ${id}@${startTime.toISOString()} finished@${endTime.toISOString()}`,
        );

        return { startTime, endTime };
    }
}

// Implementation needed
interface ShipmentUpdateListenerInterface {
    receiveUpdate(id: string, shipmentData: any): any;
}

// Assume all the code is running in one NodeJS process (or browser window/tab)
// with the same id never run concurrently (push the shipmentData in concurrentQueue).
//Process concurrently all the ids that have unique id.
class ShipmentUpdateListener implements ShipmentUpdateListenerInterface {
    private runnerOn = false;
    private searchIndex: ShipmentSearchIndex;
    private queueHandler = new Map<String, any>();
    private queueConcurrencyHandler = new Map<String, any>();
    constructor() {
        this.searchIndex = new ShipmentSearchIndex();
    }

    async receiveUpdate(id: string, shipmentData: any) {
        this.updateQueue(id, shipmentData);
        if (!this.runnerOn) {
            this.runQueue();
        }
    }
    //Push all the messages (id,shipmentData) in the queue for processing
    private updateQueue(id: string, shipmentData: any) {
        //If an id is present add the shipmentData in the array for id
        if (!this.queueHandler.has(id))
            this.queueHandler.set(id, [shipmentData]);
        else {
            this.queueHandler.set(id, this.queueHandler.get(id).push(shipmentData));
        }
    }
    //Start processing queued messages
    private async startQueue() {
        let promises = [];
        while (this.queueHandler.size !== 0) {
            //Take first entry from the queue
            const { done, value } = this.queueHandler.entries().next();
            if (done) {
                return;
            }
            let shipmentData = value[1].shift();
            //if an id contains more than 1 shipment data, take only 1 shipment data to run concurrently with other requests
            this.queueConcurrencyHandler.set(value[0], value[1]);
            promises.push(this.searchIndex.updateShipment(value[0], shipmentData));
        }
        //Run updateShipment for all unique ids, the concurrent shipmentdata for same id is stored in queueConcurrencyHandler queue.
        await Promise.all(promises);
        //Update the queue handler
        this.queueHandler = this.queueConcurrencyHandler;
        if (this.queueHandler.size !== 0) {
            return true;
        } else return false;
    }

    //Till all the messages have been processed, run the queue.
    private async runQueue() {
        this.runnerOn = true;
        let isQueueEmpty = false;
        while (!isQueueEmpty) {
            isQueueEmpty = await this.startQueue();
        }
        this.runnerOn = false;
    }


}

const sampleData = [
    { id: '1', data: 'one' },
    { id: '2', data: 'two' },
    { id: '3', data: 'three' },
    { id: '1', data: 'one' },
    { id: '2', data: 'two' },
    { id: '3', data: 'three' },
    { id: '14', data: 'one' },
    { id: '2w', data: 'two' },
    { id: '3e', data: 'three' },
];

function basicTest() {
    const updateListener = new ShipmentUpdateListener();
    for (const update of sampleData) {
        updateListener.receiveUpdate(update.id, update.data);
    }
}

basicTest();