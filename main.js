//var apiBase = 'https://cors-anywhere.herokuapp.com/'
window.apiBase = 'http://127.0.0.1:8080/'




function getXML(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.responseXML);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

async function getServerAddress() {
  if (window.location.hash) {
    return window.location.hash.replace('#', '')
  } else {
    return '66.151.138.182:27015' // default to Hyperion when no URL fragment specifies a server
  }
}

async function _parsePlayer(playerDoc, inputPlayer) {
  if (!playerDoc) {
    return {
      historickd: 0,
      historickills: 0,
      historicdeaths: 0,
      wl: 0,
      wins: 0,
      losses: 0,
      link: inputPlayer.name,
      steamlink: `<a href='https://steamidfinder.com/lookup/${inputPlayer.id}'>${inputPlayer.id}</a>`

    }
  }
  var linkid = playerDoc.getElementsByTagName('id')[0].firstChild.data
  var name = playerDoc.getElementsByTagName('name')[0].firstChild.data
  var link = `<a href='${clientAPIBaseURL}/playerinfo/${linkid}'>${name}</a>`
  var steamlink = `<a href='https://steamidfinder.com/lookup/${inputPlayer.id}'>${inputPlayer.id}</a>`
  var wins = playerDoc.getElementsByTagName('wins')[0].firstChild.data
  var losses = playerDoc.getElementsByTagName('losses')[0].firstChild.data
  var historicKills = playerDoc.getElementsByTagName('kills')[0].firstChild.data
  var historicDeaths = playerDoc.getElementsByTagName('deaths')[0].firstChild.data
  var historicKDRaw = (historicKills / historicDeaths).toFixed(3)
  if (isFinite(historicKDRaw)) {
    var historickd = historicKDRaw
  } else {
    var historickd = 0
  }
  var wlRaw = (wins / losses).toFixed(3)
  if (isFinite(wlRaw)) {
    var wl = wlRaw
  } else {
    var wl = 0
  }
  return {
    historickd: Number(historickd),
    historickills: Number(historicKills),
    historicdeaths: Number(historicDeaths),
    wl: Number(wl),
    wins: Number(wins),
    losses: Number(losses),
    link: link,
    steamlink: steamlink
  }
}

async function _getPlayerFromAPI(clientAPIBaseURL, player) {
  try {
    var playerDoc = await getXML(`${apiBase}${clientAPIBaseURL}/api/playerinfo/tf/${player.id}`) // encodeURIComponent ?
    if (playerDoc.getElementsByTagName('error').length > 0) {
      return false
    } // API errors with HTTP 200 :\
    return playerDoc
  } catch (exception) {
    console.error(`Failed to retrieve player info for ${id} (${name}): (${exception})`)
    return false
  }
}

async function getPlayer(clientAPIBaseURL, inputPlayer) {
  var cacheKey = `${clientAPIBaseURL}::${inputPlayer.id}`
  var cached = await store.get(cacheKey)
  if (cached === undefined) {
    console.log(`Cache miss on ${cacheKey}`)
    var playerDoc = await _getPlayerFromAPI(clientAPIBaseURL, inputPlayer)
    //if (!playerDoc) { return {wins: 0,losses: 0,wl: 0,historickills: 0,historicdeaths: 0,historickd: 0} } // no need to store. We're done here.
    var player = await _parsePlayer(playerDoc, inputPlayer)
    //          if (typeof(player.link) === 'undefined') { player.link = player.name }
    await store.set(cacheKey, player, Date.now() + 259200000)
    return Object.assign(player, inputPlayer)
    // get player, parse, timestamp, store, return
  } else {
    console.log(`Cache hit on ${cacheKey}`)
    return Object.assign(cached, inputPlayer)
    // check timestamp, if bad timestamp, do same as above
    // if (cached.time < (Date.now() - 259200000)) { // 3 days in ms }
  }
}


/* MAIN */
var main = async function () {
  const done = await contentLoaded
  console.log('loaded')
  const server = await getServerAddress()

  const serverDoc = await getXML(`${apiBase}http://api.gameme.net/serverinfo/${server}/players`)
  window.clientAPIBaseURL = serverDoc.getElementsByTagName("url")[0].firstChild.data
  //playersDoc = serverDoc.documentElement.childNodes[1].childNodes["0"].childNodes[15]
  const mapName = serverDoc.getElementsByTagName("map")[0].firstChild.data
  const playersRaw = serverDoc.getElementsByTagName("player")
  window.players = []

  for (var i = 0; i < playersRaw.length; i++) {
    $('#status').text(`Loading ${i+1} of ${playersRaw.length} players, please wait...`)
    var playerRaw = playersRaw[i]
    var name = playerRaw.getElementsByTagName('name')[0].firstChild.data
    var team = playerRaw.getElementsByTagName('team')[0].firstChild.data
    var id = playerRaw.getElementsByTagName('uniqueid')[0].firstChild.data
    var kills = Number(playerRaw.getElementsByTagName('kills')[0].firstChild.data)
    var deaths = Number(playerRaw.getElementsByTagName('deaths')[0].firstChild.data)
    var kdRaw = (kills / deaths).toFixed(3)
    if (isFinite(kdRaw)) {
      var kd = kdRaw
    } else {
      var kd = 0
    }

    var player = await getPlayer(clientAPIBaseURL, {
      name: name,
      team: team,
      id: id,
      kills: Number(kills),
      deaths: Number(deaths),
      kd: Number(kd)
    })
    console.log(player)
    window.players.push(player)
    //await addRow(player)
  }

  console.log(players)

  $.dynatableSetup({
    features: {
      paginate: false,
      sort: true,
      pushState: true,
      search: false,
      recordCount: false,
      perPageSelect: false
    },
    dataset: {
      perPageDefault: 20,
      sorts: {
        kills: -1
      }
    }
  });

  $('#Red').dynatable({
    dataset: {
      records: window.players.filter(p => {
        return p.team === 'Red'
      })
    }
  })
  $('#Blue').dynatable({
    dataset: {
      records: window.players.filter(p => {
        return p.team === 'Blue'
      })
    }
  })
  // calculate per-team KD
  // calculate per-team win/loss (average W/L)
  // $('#stats > tbody:last-child').append('<tr>...</tr><tr>...</tr>');
  // calc stats
  redStats = {
    kills: 0,
    deaths: 0,
    wins: 0,
    losses: 0
  }
  blueStats = {
    kills: 0,
    deaths: 0,
    wins: 0,
    losses: 0
  }
  reds = window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Red"}) // only conisder players with a historical record
  blues = window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Blue"})
  reds.map(p => {
    redStats.kills += Number(p.kills),
    redStats.deaths += Number(p.deaths),
    redStats.wins += Number(p.wins),
    redStats.losses += Number(p.losses)
  })
  redStats.wl = Number((redStats.wins / redStats.losses).toFixed(4))
  redStats.kd = Number((redStats.kills / redStats.deaths).toFixed(4))

  blues.map(p => {
    blueStats.kills += Number(p.kills),
    blueStats.deaths += Number(p.deaths),
    blueStats.wins += Number(p.wins),
    blueStats.losses += Number(p.losses)
  })
  blueStats.wl = Number((blueStats.wins / blueStats.losses).toFixed(4))
  blueStats.kd = Number((blueStats.kills / blueStats.deaths).toFixed(4))
  console.log(redStats, blueStats)




  Highcharts.chart('container', {
    chart: {
        type: 'column'
    },
    title: {
        text: 'Efficiency Optimization by Branch'
    },
    xAxis: {
        categories: Object.keys(redStats)
    },
    yAxis: [{
        min: 0,
        title: {
            text: 'K:D'
        }
    }, {
        title: {
            text: 'W:L'
        },
        opposite: true
    }],
    legend: {
        shadow: false,
    },
    tooltip: {
        shared: true
    },
    plotOptions: {
        column: {
            grouping: false,
            shadow: false,
            borderWidth: 0
        }
    },
    series: [{
        name: 'RED',
        color: 'rgba(244, 67, 54, .9)',
        data: Object.values(redStats),
        pointPadding: 0.3,
        pointPlacement: -0.2
    }, {
        name: 'BLU',
        color: 'rgba(33, 150, 243, .9)',
        data: Object.values(blueStats),
        pointPadding: 0.4,
        pointPlacement: -0.2
    }]
});


  $('#stats').show()
  $('#Red').show()
  $('#Blue').show()
  $('#status').hide()
}()


/* NOTES */