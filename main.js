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
    return '' 
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
async function main() {
//  const done = await contentLoaded
  if (window.location.hash.replace('#', '') === '') {  // empty hash shows or no hash shows how to use this
    $('#error').show()
    return
  } else {
    $('#error').hide()
  }
  console.log('main()')
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

  redStats = {
    kills: 0,
    deaths: 0,
    historickd: 0,
    historickdpct: 0,
    wins: 0,
    losses: 0
  }
  blueStats = {
    kills: 0,
    deaths: 0,
    historickd: 0,
    historickdpct: 0,
    wins: 0,
    losses: 0
  }
  // only conisder players with a historical record (where historickd > 0)
  reds = window.players.filter(p => {
    return p.historickd > 0
  }).filter(p => {
    return p.team === "Red"
  }) 
  blues = window.players.filter(p => {
    return p.historickd > 0
  }).filter(p => {
    return p.team === "Blue"
  })
  reds.map(p => {
    redStats.kills += Number(p.kills),
      redStats.deaths += Number(p.deaths),
      redStats.historickd += Number(p.historickd),
      redStats.wins += Number(p.wins),
      redStats.losses += Number(p.losses)
  })
 // 8 / 2 == 80% win rate
 // total games = wins + losses 
 // win pct = games won / total games
  //80% win rate
  redStats.totalRounds = Number(redStats.wins + redStats.losses)
  redStats.winPct = Number(((redStats.wins / redStats.totalRounds) * 100).toFixed(2))
  redStats.wl = Number(((redStats.wins / redStats.losses) * 100).toFixed(2))
  redStats.kd = Number(((redStats.kills / redStats.deaths) * 100).toFixed(2))
  redStats.historickdpct = Number(((redStats.historickd / Object.values(redStats).length) * 100).toFixed(2))

  blues.map(p => {
    blueStats.kills += Number(p.kills),
      blueStats.deaths += Number(p.deaths),
      blueStats.historickd += Number(p.historickd),
      blueStats.wins += Number(p.wins),
      blueStats.losses += Number(p.losses)
  })
  blueStats.totalRounds = Number(blueStats.wins + blueStats.losses)
  blueStats.winPct = Number(((blueStats.wins / blueStats.totalRounds) * 100).toFixed(2))
  blueStats.wl = Number(((blueStats.wins / blueStats.losses) * 100).toFixed(2))
  blueStats.kd = Number(((blueStats.kills / blueStats.deaths) * 100).toFixed(2))
  blueStats.historickdpct = Number(((blueStats.historickd / Object.values(blueStats).length) * 100).toFixed(2))



  console.log(redStats, blueStats)
  Highcharts.chart('container', {
    chart: {
      zoomType: 'xy'
    },
    title: {
      text: 'Team Summary'
    },
    xAxis: [{
      categories: ['Current KPD', 'Historic KPD', 'Historic Win %'],
      crosshair: true
    }],
    yAxis: [{ // Primary yAxis
      labels: {
        format: '{value}',
        style: {
          color: 'rgba(33, 33, 33, 1)'
        }
      },
      title: {
        text: 'KPD',
        style: {
          color: 'rgba(33, 33, 33, 1)'
        }
      }
    }, { // Secondary yAxis
      labels: {
        format: '{value}%',
        style: {
          color: 'rgba(224, 224, 224, 1)'
        }
      },
      title: {
        text: 'Win %',
        style: {
          color: 'rgba(224, 224, 224, 1)'
        }
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
        //  grouping: false,
        //  shadow: false,
        //  borderWidth: 0
      }
    },
    series: [{
      name: 'Current KPD',
      type: 'column',
      color: 'rgba(239, 154, 154, .9)',
      yAxis: 1,
      data: [redStats.kd, blueStats.kd],
      tooltip: {
        valueSuffix: ' KPD'
      }
    },{
        name: 'Historic KPD',
        type: 'column',
        color: 'rgba(239, 154, 154, .9)',
        yAxis: 1,
        data: [redStats.historickdpct, blueStats.historickdpct],
        tooltip: {
          valueSuffix: ' KPD'
        }
      }, {
        name: 'Historic Win %',
        type: 'column',
        color: 'rgba(144, 202, 249, .9)',
        yAxis: 1,
        data: [redStats.winPct, blueStats.winPct],
        tooltip: {
          valueSuffix: '%'
        }
      }
    ]
  })

  
Highcharts.chart('redperplayer', {
  chart: {
      type: 'column'
  },
  title: {
      text: 'RED Players'
  },
  xAxis: {
      categories: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Red"}).map(p => {return p.name}),
      crosshair: true
  },
  yAxis: {
      min: 0,
      minorTicks: false,
      title: {
          text: ''
      }
  },
  tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          '<td style="padding:0"><b>{point.y}</b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
      valueDecimals: 3
  },
  plotOptions: {
      column: {
          pointPadding: 0.05,
          borderWidth: 0
      }
  },
  series: [{
      name: 'Kills per Death',
      color: 'rgba(244, 67, 54, 1)',
      data: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Red"}).map(p => {return p.kd})
  }, {
      name: 'Historic KPD',
      color: 'rgba(240, 98, 146, 1)',
      data: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Red"}).map(p => {return p.historickd})

  }, {
      name: 'Wins per Loss',
      color: 'rgba(142, 36, 170, 1)',
      data: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Red"}).map(p => {return p.wl})
  }]
})

Highcharts.chart('bluperplayer', {
  chart: {
      type: 'column'
  },
  title: {
      text: 'BLU Players'
  },
  xAxis: {
      categories: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Blue"}).map(p => {return p.name}),
      crosshair: true
  },
  yAxis: {
      min: 0,
      minorTicks: false,
      title: {
          text: ''
      }
  },
  tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
          '<td style="padding:0"><b>{point.y}</b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
      valueDecimals: 3
  },
  plotOptions: {
      column: {
          pointPadding: 0.05,
          borderWidth: 0
      }
  },
  series: [{
      name: 'Kills per Death',
      color: '#03a9f4',
      data: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Blue"}).map(p => {return p.kd})
  }, {
      name: 'Historic KPD',
      color: '#00bcd4',
      data: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Blue"}).map(p => {return p.historickd})

  }, {
      name: 'Wins per Loss',
      color: '#009688',
      data: window.players.filter(p => {return p.historickd > 0}).filter(p => {return p.team === "Blue"}).map(p => {return p.wl})
  }]
})



  $('#redperplayer').show()
  $('#bluperplayer').show()
  $('#container').show()
  $('#Red').show()
  $('#Blue').show()
  $('#status').hide()
}

$(window).on('hashchange', function () {
  main()
})

$( document ).ready(function() {
  main()
})


/* NOTES */
