var BitrateRule;

function BitrateRuleClass() {

    let context = this.context;
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let instance;

    // Gets called when the rule is created
    function setup() {
        console.log('Rule Created');
    }

    const targetTputFactor = 1; // 80% of available throughput
    const minBufferLevel = 3; // Minimum buffer level in seconds
    let movingAverageThroughput = [];
    let movingAverageWindowSize = 3;
    let latest_buffer_low = 0;
    let lastSwitchTime = 0;
    
    function getMaxIndex(rulesContext) {
        let metricsModel = MetricsModel(context).getInstance();
        var mediaType = rulesContext.getMediaInfo().type;
        let streamController = StreamController(context).getInstance();
        let abrController = rulesContext.getAbrController();
        let currentQuality = abrController.getQualityFor(mediaType, streamController.getActiveStreamInfo().id);
        let bitrateList = rulesContext.getMediaInfo()['bitrateList'];
    
        // Current throughput in kbps
        let tput = player.getAverageThroughput(mediaType);
        
        movingAverageThroughput.push(tput);
        if (movingAverageThroughput.length > movingAverageWindowSize) {
            movingAverageThroughput.shift();
        }

        avgtput = movingAverageThroughput.reduce((a, b) => a + b, 0) / movingAverageThroughput.length;
        
        let targetBandwidth = tput * targetTputFactor;
        // Current buffer level in seconds
        let bufferLevel = player.getDashMetrics().getCurrentBufferLevel('video');
    
        let quality = currentQuality;
        let reason = '';
        let time = new Date().getTime();
    
        // Ensure buffer is at least 4 seconds before considering increasing quality
        if (bufferLevel < minBufferLevel) {
            // Reduce quality to maintain buffer if it's below the threshold
            quality = Math.max(currentQuality - 1, 0);
            latest_buffer_low = time;
            reason = 'Buffer level below 4 seconds, reducing quality';
        } else if (time - latest_buffer_low > 2000 && time - lastSwitchTime > 11000) {
            // Choose the highest quality whose bandwidth is <= 80% of available throughput
            for (let i = 0; i < bitrateList.length; i++) {
                if (bitrateList[i].bandwidth <= targetBandwidth * 1000) {
                    quality = i;
                } else {
                    break;
                }
            }
            reason = `Targeting ${targetTputFactor * 100}% of throughput (${targetTputFactor * 100}% of ${avgtput} kbps)`;
        } 
    
        // If current quality equals the target quality, return no change
        if (currentQuality === quality) {
            return SwitchRequest(context).create(); // No change
        }
    
        // Log the switch and return the new quality
        console.log(`Switching bitrate to ${bitrateList[quality].bandwidth / 1000} kbps (quality level ${quality})`);
        console.log(`Reason: ${reason}`);
        lastSwitchTime = time;
    
        let switchRequest = SwitchRequest(context).create();
        switchRequest.quality = quality;
        switchRequest.reason = reason;
        switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
        return switchRequest;
    }
    

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

BitrateRuleClass.__dashjs_factory_name = 'BitrateRule';
BitrateRule = dashjs.FactoryMaker.getClassFactory(BitrateRuleClass);