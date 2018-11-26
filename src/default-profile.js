// defaultProfile is a simple user-profile JSON data model
const defaultProfile = {
  name: {
    first: 'first',
    last: 'last',
    other: []
  },
  bio: 'you should write something interesting here...',
  pic: {
    url: 'https://i.stack.imgur.com/l60Hf.png'
  },
  dob: null,
  social: [
    {
      service: 'github',
      username: null,
      url: null
    }
  ],
  work: [
    {
      title: 'unemployed',
      employer: null,
      start: null,
      url: null,
      end: null
    }
  ]
}

export { defaultProfile }
