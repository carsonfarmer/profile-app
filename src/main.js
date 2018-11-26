/* eslint no-undef: "error" */
/* eslint-env browser */
import 'babel-polyfill'
import qs from 'query-string'
import ko from 'knockout'
import 'knockout-mapping'
import $ from 'jQuery'
import getIpfs from './ipfs-promise'
import { defaultProfile } from './default-profile'

// Special handler for contenteditable elements
// Comes from:
// https://stackoverflow.com/questions/19370098/knockout-contenteditable-binding
// Don't worry about this for purposes of this tutorial
ko.bindingHandlers.editable = {
  init: function (element, valueAccessor, allBindingsAccessor) {
    // const value = ko.unwrap(valueAccessor())
    const lazy = allBindingsAccessor().lazy
    $(element).on('input', function () {
      if (this.isContentEditable && ko.isWriteableObservable(lazy)) {
        console.log(this.innerHTML)
        lazy(this.innerHTML)
      }
    })
  },
  update: function (element, valueAccessor) {
    const value = ko.unwrap(valueAccessor())
    element.contentEditable = value
    if (!element.isContentEditable) {
      $(element).trigger('input')
    }
  }
}

// Don't update view until after we've updated model
ko.bindingHandlers.lazy = {
  update: function (element, valueAccessor) {
    const value = ko.unwrap(valueAccessor())
    if (!element.isContentEditable) {
      element.innerHTML = value
    }
  }
}

// Simple file upload binding handler
ko.bindingHandlers.fileUpload = {
  init: function (element, valueAccessor) {
    $(element).change(function () {
      valueAccessor()(element.files[0])
    })
  },
  update: function (element, valueAccessor) {
    if (ko.unwrap(valueAccessor()) === null) {
      $(element).wrap('<form>').closest('form').get(0).reset()
      $(element).unwrap()
    }
  }
}

// getProfileJSON is an async function that fetchs custom ipns json data
const getProfileJSON = async (ipfs, ipns) => {
  // Resolve IPNS hash (this is a new feature!)
  const name = await ipfs.name.resolve(`/ipns/${ipns}`)
  // Now, fetch files...
  const files = await ipfs.files.get(`${name.path}/json`)
  // Extract binary file contents
  const string = String.fromCharCode.apply(null, files[0].content)
  // Parse/convert to JSON
  return JSON.parse(string)
}

// setup is our async initializer function
const setup = async () => {
  try {
    // Get a reference to the running, or new, IPFS peer/node
    const ipfs = await getIpfs()
    // Grab query string to check who's profile we're viewing
    const query = qs.parse(location.search)
    // Grab id of this IPFS peer, to check if we're viewing our own profile
    const id = await ipfs.id()
    // IPNS id that we will use to request profile information
    const ipns = query.pid ? query.pid : id.id

    // Some reporting to help us when developing
    console.log(`Viewing profile for ${ipns} from peer with id ${id.id}`)
    if (ipns === id.id) {
      console.log('Viewing own profile, editing will be enabled!')
    }
    // Setup a viewModel based on our JSON structure
    const viewModel = ko.mapping.fromJS(defaultProfile)
    // Add extra observables for when we're loading or editing our profile
    viewModel.state = {}
    viewModel.state.loading = ko.observable(true)
    viewModel.state.editing = ko.observable(false)

    // Function to handle edit profile click
    viewModel.handleEdit = async function () {
      const editing = this.state.editing()
      // Toggle our editing state
      this.state.editing(!editing)
      if (editing) {
        // Export viewModel to JSON
        const json = ko.mapping.toJSON(viewModel)
        // IPFS add options, currently just defaults + dir wrapping
        const options = { wrapWithDirectory: true, onlyHash: false, pin: true }
        // Create binary buffer from JSON string
        const buf = Buffer.from(json)
        try {
          // Add the new file (same as on desktop)
          const res = await ipfs.files.add({ path: 'json', content: buf }, options)
          // Publish new file to peer's PeerID
          const pub = await ipfs.name.publish(res[1].hash)
          console.log(`published '${pub.value}' to profile: ${pub.name}`)
          window.alert(`published update for profile:\n${pub.name}`)
        } catch (err) {
          console.log(err)
        }
      }
    }

    viewModel.uploadFile = function (file) {
      var reader = new FileReader()
      // Closure to capture the file information.
      reader.onload = (function (theFile) {
        return function (e) {
          const data = JSON.parse(e.target.result)
          viewModel.state.editing(false)
          ko.mapping.fromJS(data, viewModel)
          viewModel.handleEdit()
        }
      })(file)

      // Read in the image file as a data URL.
      reader.readAsText(file)
    }

    // Apply the viewModel bindings
    ko.applyBindings(viewModel)

    try {
      // Get profile information if available
      const data = await getProfileJSON(ipfs, ipns)
      // Update our existing viewModel target
      ko.mapping.fromJS(data, viewModel)
    } catch (err) {
      console.log(`${err}: using default profile.`)
    }

    // Change the loading state to update the view
    viewModel.state.loading(false)
  } catch (err) {
    console.log(err)
  }
}
setup()
