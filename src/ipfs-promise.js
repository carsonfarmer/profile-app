#!/usr/bin/env node
'use strict'

import IPFS from 'ipfs'

const getIpfs = (opts) => {
  opts = opts || {}

  return new Promise(function (resolve, reject) {
    var ipfs = new IPFS(opts)

    var onReady = function () {
      ipfs.removeListener('error', onError)
      resolve(ipfs)
    }

    var onError = function (err) {
      ipfs.removeListener('ready', onReady)
      reject(err)
    }

    ipfs.once('ready', onReady).once('error', onError)
  })
}

export default getIpfs
