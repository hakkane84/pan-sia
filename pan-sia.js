// ------------------------------------------------------
//                  PAN-SIA (by Keops.cc)
// ------------------------------------------------------

// Dependencies
var fs = require('fs');
var cron = require('./node_modules/cron');
var sia = require('./node_modules/sia.js');
var hs = require('./node_modules/hyperspace.js');
var siaprime = require('./node_modules/siaprime.js');
var siaclassic = sia

// Array of clients to watch. You need to configure the ports to your setup
var daemons = [
    {
        name: "Sia",
        wrapper: sia,
        call: "localhost:9980",
        reportData: true
    },{
        name: "Hyperspace",
        wrapper: hs,
        call: "localhost:5580",
        reportData: true
    },{
        name: "SiaPrime",
        wrapper: siaprime,
        call: "localhost:4280",
        reportData: true
    },{
        name: "SiaClassic",
        wrapper: siaclassic,
        call: "localhost:3390",
        reportData: true
    }
]
var daemonNum = 0

// Other parameters
var webpath = './'
var currentFilePath = webpath + "pansia_current.json"
var evolutionFilePath = webpath + "pansia_evolution.json"

// Initial log lines
console.log()
console.log("---------------------------------------------")
console.log("+          PAN-SIA (by Keops.cc)            +")
console.log("---------------------------------------------")
console.log()
console.log("The script is running and updating data every 30 minutes")


// Cron Job every 30 minutes
var cronJob = cron.job("00 0,30 * * * *", function(){

    loadCurrentFile()

    function loadCurrentFile() {
        // Loads the file with the current stats, to use them as a template in case the daemons are not accesible this time
        var data1 = '';
        var chunk1;
        var stream1 = fs.createReadStream(currentFilePath)
        stream1.on('readable', function() { //Function just to read the whole file before proceeding
            while ((chunk1=stream1.read()) != null) {
                data1 += chunk1;}
        });
        stream1.on('end', function() {
            var currentStats = JSON.parse(data1)
            for (var i = 0; i < daemons.length; i++) {
                if (i <= currentStats.length) { // Avoids accessing an inexistent array position
                    // Taking the previous values only if they are a number
                    if (daemons[i].height > 0) {daemons[i].height = currentStats[i].height} else {daemons[i].height = 0}
                    if (daemons[i].difficulty > 0) {daemons[i].difficulty = currentStats[i].difficulty} else {daemons[i].difficulty = 0}
                    if (daemons[i].hashrate > 0) {daemons[i].hashrate = currentStats[i].hashrate} else {daemons[i].hashrate = 0}
                    if (daemons[i].usedstorage > 0) {daemons[i].usedstorage = currentStats[i].usedstorage} else {daemons[i].usedstorage = 0}
                    if (daemons[i].totalstorage > 0) {daemons[i].totalstorage = currentStats[i].totalstorage} else {daemons[i].totalstorage = 0}
                    if (daemons[i].activehosts > 0) {daemons[i].activehosts = currentStats[i].activehosts} else {daemons[i].activehosts = 0}
                    if (daemons[i].usedstorage_online > 0) {daemons[i].usedstorage_online = currentStats[i].usedstorage_online} else {daemons[i].usedstorage_online = 0}
                    if (daemons[i].totalstorage_online > 0) {daemons[i].totalstorage_online = currentStats[i].totalstorage_online} else {daemons[i].totalstorage_online = 0}
                    if (daemons[i].onlinehosts > 0) {daemons[i].onlinehosts = currentStats[i].onlinehosts} else {daemons[i].onlinehosts = 0}
                    try {
                        daemons[i].version = currentStats[i].version
                    } catch(e) {
                        daemons[i].version = 0
                    }
                } else {
                    daemons[i].height = 0
                    daemons[i].difficulty = 0
                    daemons[i].hashrate = 0
                    daemons[i].usedstorage = 0
                    daemons[i].totalstorage = 0
                    daemons[i].activehosts = 0
                    daemons[i].usedstorage_online = 0
                    daemons[i].totalstorage_online = 0
                    daemons[i].onlinehosts = 0
                    daemons[i].version = 0
                }
            }
            consensusCall(daemons, daemonNum)
        })
        stream1.on('error', function() {
            console.log("No file found with current stats. Creating a new one")
            // Blank values
            for (var i = 0; i < daemons.length; i++) {
                daemons[i].height = 0
                daemons[i].difficulty = 0
                daemons[i].hashrate = 0
                daemons[i].usedstorage = 0
                daemons[i].totalstorage = 0
                daemons[i].activehosts = 0
                daemons[i].usedstorage_online = 0
                daemons[i].totalstorage_online = 0
                daemons[i].onlinehosts = 0
                daemons[i].version = 0
            }
            consensusCall(daemons, daemonNum)
        })
    }


    function consensusCall(daemons, daemonNum) {
        // Gets the block number and difficulty
        
        var wrapper = daemons[daemonNum].wrapper
        wrapper.connect(daemons[daemonNum].call)
        .then((siad) => { 
            siad.call('/consensus').then((consensus) =>  {
                daemons[daemonNum].height = parseFloat(consensus.height)
                daemons[daemonNum].difficulty = parseFloat(consensus.difficulty)
                hostsbCall(daemons, daemonNum)
            }).catch((err) => { // Errors of connection to daemon
                console.log("**** Error retrieving consensus from " + daemons[daemonNum].name)
                hostsbCall(daemons, daemonNum)
            }) 
        }).catch((err) => { // Errors of connection to daemon
            console.log("**** Error connecting to " + daemons[daemonNum].name)
            hostsbCall(daemons, daemonNum)
        }) 
    }


    function hostsbCall(daemons, daemonNum) {
        // Gets the data about the hosting network: active hosts

        var wrapper = daemons[daemonNum].wrapper
        wrapper.connect(daemons[daemonNum].call)
        .then((siad) => { 
            siad.call('/hostdb/active').then((hostdb) =>  {
                var stringdb = JSON.stringify(hostdb)
                var a = stringdb.substr(0, stringdb.length-1) //This removes the last "}"
                var b = a.slice(9, a.length) // Removes first characters
                var api = JSON.parse(b) // Parsing to an array
                if (api == null) {
                    api = [] // Avoids possible errors
                }

                var usedStorage = 0
                var totalStorage = 0
                var hostsCount = 0
                for (var i = 0; i < api.length; i++) {

                    // Discerning between versions of hosts in Sia and SiaClassic
                    if (daemons[daemonNum].name == "Sia" || daemons[daemonNum].name == "SiaClassic") {
                        // We process this in a separate function
                        var returnedArray = separateHostsVersion(daemons, daemonNum, api, usedStorage, totalStorage, hostsCount, i)
                        // Collecting back the data form the returned array
                        usedStorage = returnedArray[0]
                        totalStorage = returnedArray[1]
                        hostsCount = returnedArray[2]

                    } else {
                        // Just add the hosts data to the count
                        usedStorage = usedStorage + parseInt(api[i].totalstorage) - parseInt(api[i].remainingstorage)
                        totalStorage = totalStorage + parseInt(api[i].totalstorage)
                        hostsCount++
                    }
                }

                daemons[daemonNum].usedstorage = usedStorage
                daemons[daemonNum].totalstorage = totalStorage
                daemons[daemonNum].activehosts = hostsCount
                
                hostsOnlineCall(daemons, daemonNum)

            }).catch((err) => { // Errors of connection to daemon
                console.log("**** Error retrieving hostdb from " + daemons[daemonNum].name)
                hostsOnlineCall(daemons, daemonNum)
            }) 
        }).catch((err) => { // Errors of connection to daemon
            console.log("**** Error connecting to " + daemons[daemonNum].name)
            hostsOnlineCall(daemons, daemonNum)
        })
    }


    function hostsOnlineCall(daemons, daemonNum) {
        // Gets the data about the hosting network: all online hosts
        var wrapper = daemons[daemonNum].wrapper
        wrapper.connect(daemons[daemonNum].call)
        .then((siad) => { 
            siad.call('/hostdb/all').then((api) =>  {
                var stringdb = JSON.stringify(api)
                var a = stringdb.substr(0, stringdb.length-1) //This removes the last "}"
                var b = a.slice(9, a.length) // Removes first characters
                var hostdb = JSON.parse(b) // Parsing to an array
                
                if (hostdb == null) {
                    hostdb = [] // Avoids possible errors
                }
                
                console.log("All: " + hostdb.length)

                // Filtering only the online
                for (var i = 0; i < hostdb.length; i++) {
                    if (hostdb[i].scanhistory != null) {
                        if (hostdb[i].scanhistory[hostdb[i].scanhistory.length-1].success != true) {
                            hostdb.splice(i, 1)
                            i--
                        }
                    } else {
                        hostdb.splice(i, 1)
                        i--
                    } 
                }

                var usedStorage = 0
                var totalStorage = 0
                var hostsCount = 0
                for (var i = 0; i < hostdb.length; i++) {
                    // Discerning between versions of hosts in Sia and SiaClassic
                    if (daemons[daemonNum].name == "Sia" || daemons[daemonNum].name == "SiaClassic") {
                        // We process this in a separate function
                        var returnedArray = separateHostsVersion(daemons, daemonNum, hostdb, usedStorage, totalStorage, hostsCount, i)
                        // Collecting back the data form the returned array
                        usedStorage = returnedArray[0]
                        totalStorage = returnedArray[1]
                        hostsCount = returnedArray[2]

                    } else {
                        // Just add the hosts data to the count
                        usedStorage = usedStorage + parseInt(hostdb[i].totalstorage) - parseInt(hostdb[i].remainingstorage)
                        totalStorage = totalStorage + parseInt(hostdb[i].totalstorage)
                        hostsCount++
                    }
                }

                daemons[daemonNum].usedstorage_online = usedStorage
                daemons[daemonNum].totalstorage_online = totalStorage
                daemons[daemonNum].onlinehosts = hostsCount
                versionCall(daemons, daemonNum)

            }).catch((err) => { // Errors of connection to daemon
                console.log("**** Error retrieving hostdb from " + daemons[daemonNum].name)
                versionCall(daemons, daemonNum)
            }) 
        }).catch((err) => { // Errors of connection to daemon
            console.log("**** Error connecting to " + daemons[daemonNum].name)
            versionCall(daemons, daemonNum)
        })
    }


    function separateHostsVersion(daemons, daemonNum, api, usedStorage, totalStorage, hostsCount, i) {
        // Discerns if the host is in the Sia network or on the legacy network
        var version = api[i].version
        var secondDigit = parseInt(version.slice(2,3))
        var thirdDigit = parseInt(version.slice(4,5))
        
        // Checking if the version corresponds to Sia
        var isSia = false
        if (secondDigit > 3) {isSia = true}
        if (secondDigit == 3 && thirdDigit >= 7) {isSia = true}

        if (isSia == true && daemons[daemonNum].name == "Sia") {
            // It is a Sia Host and we are indexig Sia hosts: let's add the data
            usedStorage = usedStorage + parseInt(api[i].totalstorage) - parseInt(api[i].remainingstorage)
            totalStorage = totalStorage + parseInt(api[i].totalstorage)
            hostsCount++
        } else if (isSia == false && daemons[daemonNum].name == "SiaClassic") {
            // It is a Sia Host and we are indexig Sia hosts: let's add the data
            usedStorage = usedStorage + parseInt(api[i].totalstorage) - parseInt(api[i].remainingstorage)
            totalStorage = totalStorage + parseInt(api[i].totalstorage)
            hostsCount++
        }

        //Returning the data
        var returnArray = [
            usedStorage,
            totalStorage,
            hostsCount
        ]
        return returnArray
    }


    function versionCall(daemons, daemonNum) {
        // Gets the daemon version being used
        
        var wrapper = daemons[daemonNum].wrapper
        wrapper.connect(daemons[daemonNum].call)
        .then((siad) => { 
            siad.call('/daemon/version').then((version) =>  {
                daemons[daemonNum].version = version.version
                explorerCall(daemons, daemonNum)
            }).catch((err) => { // Errors of connection to daemon
                console.log("**** Error retrieving version from " + daemons[daemonNum].name)
                explorerCall(daemons, daemonNum)
            }) 
        }).catch((err) => { // Errors of connection to daemon
            console.log("**** Error connecting to " + daemons[daemonNum].name)
            explorerCall(daemons, daemonNum)
        }) 
    }


    function explorerCall(daemons, daemonNum) {
        // Gets the daemon version being used
        var call = '/explorer/blocks/' + daemons[daemonNum].height
        var wrapper = daemons[daemonNum].wrapper
        wrapper.connect(daemons[daemonNum].call)
        .then((siad) => { 
            siad.call(call).then((rawblock) =>  {
                var stringraw = JSON.stringify(rawblock)
                var a = stringraw.substr(0, stringraw.length-1) //This removes the last "}"
                var b = a.slice(9, a.length) // Removes first characters
                var apiblock = JSON.parse(b)
                daemons[daemonNum].hashrate = parseInt(apiblock.estimatedhashrate)
                nextDaemon(daemons, daemonNum)
            }).catch((err) => { // Errors of connection to daemon
                console.log("**** Error retrieving explorer block from " + daemons[daemonNum].name)
                nextDaemon(daemons, daemonNum)
            }) 
        }).catch((err) => { // Errors of connection to daemon
            console.log("**** Error connecting to " + daemons[daemonNum].name)
            nextDaemon(daemons, daemonNum)
        }) 
    }


    function nextDaemon(daemons, daemonNum) {
        // Decides if moving to the next daemon or finish the routine
        daemonNum++ // Next daemon
        if (daemonNum >= daemons.length) {
            saveFiles(daemons)
        } else {
            consensusCall(daemons, daemonNum)
        }
    }


    function saveFiles(daemons) {
        // Creating the file to save
        saveArray = []
        for (var i = 0; i < daemons.length; i++) {
            saveArray.push({
                name: daemons[i].name,
                version: daemons[i].version,
                height: daemons[i].height,
                difficulty: daemons[i].difficulty,
                hashrate: daemons[i].hashrate,
                usedstorage: daemons[i].usedstorage,
                totalstorage: daemons[i].totalstorage,
                activehosts: daemons[i].activehosts,
                usedstorage_online: daemons[i].usedstorage_online,
                totalstorage_online: daemons[i].totalstorage_online,
                onlinehosts: daemons[i].onlinehosts
            })
        }

        // Saving file
        var stream = fs.createWriteStream(currentFilePath)
        var string = JSON.stringify(saveArray)
        stream.write(string)
    }
})
cronJob.start();


// Daily routine saving the most recent file in an evolution chart, at 00:05
var cronJob2 = cron.job("00 05 00 * * *", function(){
    // Opening the most recent data file
    var data1 = '';
    var chunk1;
    var stream1 = fs.createReadStream(currentFilePath)
    stream1.on('readable', function() { //Function just to read the whole file before proceeding
        while ((chunk1=stream1.read()) != null) {
            data1 += chunk1;}
    });
    stream1.on('end', function() {
        var currentStats = JSON.parse(data1)

        // Opening the evolution file
        var data2 = '';
        var chunk2;
        var stream2 = fs.createReadStream(evolutionFilePath)
        stream2.on('readable', function() { //Function just to read the whole file before proceeding
            while ((chunk2=stream2.read()) != null) {
                data2 += chunk2;}
        });
        stream2.on('end', function() {
            var evoArray = JSON.parse(data2)
            saveEvoFile(currentStats, evoArray)
        })
        stream2.on('error', function() {
            console.log("Creating new pansia_evolution file")
            evoArray = []
            saveEvoFile(currentStats, evoArray)
        })

    })
    stream1.on('error', function() {
        console.log("** Error opening pansia_evolution file")
    })


    function saveEvoFile(currentStats, evoArray) {
        // Creating the new entry
        var now = new Date;
        var timestamp = (Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()))/1000;
        var evoEntry = {
            time: timestamp,
            siaused: currentStats[0].usedstorage,
            siatotal: currentStats[0].totalstorage,
            siahosts: currentStats[0].activehosts,
            siahash: currentStats[0].hashrate,
            siaused_online: currentStats[0].usedstorage_online,
            siatotal_online: currentStats[0].totalstorage_online,
            siahosts_online: currentStats[0].onlinehosts,
            hsused: currentStats[1].usedstorage,
            hstotal: currentStats[1].totalstorage,
            hshosts: currentStats[1].activehosts,
            hshash: currentStats[1].hashrate,
            hsused_online: currentStats[1].usedstorage_online,
            hstotal_online: currentStats[1].totalstorage_online,
            hshosts_online: currentStats[1].onlinehosts,
            primeused: currentStats[2].usedstorage,
            primetotal: currentStats[2].totalstorage,
            primehosts: currentStats[2].activehosts,
            primehash: currentStats[2].hashrate,
            primeused_online: currentStats[2].usedstorage_online,
            primetotal_online: currentStats[2].totalstorage_online,
            primehosts_online: currentStats[2].onlinehosts,
            classicused: currentStats[3].usedstorage,
            classictotal: currentStats[3].totalstorage,
            classichosts: currentStats[3].activehosts,
            classichash: currentStats[3].hashrate,
            classicused_online: currentStats[3].usedstorage_online,
            classictotal_online: currentStats[3].totalstorage_online,
            classichosts_online: currentStats[3].onlinehosts,
        }
        evoArray.push(evoEntry)

        // Saving
        var stream3 = fs.createWriteStream(evolutionFilePath)
        var string3 = JSON.stringify(evoArray)
        stream3.write(string3)
        console.log("Saving daily routine - UTC time: " + timestamp)
    }

})
cronJob2.start();
