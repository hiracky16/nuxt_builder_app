const { App } = require('@slack/bolt')
const https = require('https')
require('dotenv').config()

const githubToken = process.env.GITHUB_TOKEN
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  githubToken: githubToken
})

const url = 'https://api.github.com/repos/hiracky16/e2d3-nuxt/branches'
const options = {
	headers: { 'User-Agent': 'Mozilla/5.0' }
}

const deployUrl = "https://api.github.com/repos/hiracky16/e2d3-nuxt/deployments"
const deployOptions = {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Authorization': `token ${githubToken}`,
  }
}


const requestGitHub = async () => {
  const branches = []
  await https.get(url, options, (response) => {
    let body = '';
    console.log('STATUS: ' + response.statusCode);
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body += chunk
    })

    response.on('end', (res) => {
      res = JSON.parse(body);
      res.forEach(r => branches.push({ text: r.name, value: r.name }))
      return branches
    })
  }).on('error', (e) => {
    return []
  })
}

app.command('/hello', async ({ command, ack, say }) => {
  ack()

  https.get(url, options, (response) => {
    let body = '';
    console.log('STATUS: ' + response.statusCode);
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body += chunk
    })

    response.on('end', (res) => {
      res = JSON.parse(body);
      const branches = res.map(r => {
        return { text: r.name, value: r.name }
      })
      say({
        text: 'どのブランチをデプロイしますか？',
        response_type: 'in_channel',
        attachments: [{
          text: 'ブランチを選んでください',
          fallback: "",
          color: '#3AA3E3',
          attachment_type: 'default',
          callback_id: 'select_branch',
          actions: [{
            name: 'branch_list',
            text: 'branches',
            type: 'select',
            options: branches
          }]
        }]
      })
    })
  }).on('error', (e) => {
    say({text: 'ブランチが取得できませんでした。'})
  })
})

app.action({ callback_id: 'select_branch' }, ({ body, ack, say }) => {
  const value = body.actions[0].selected_options[0].value
  ack()
  say(`${value} でデプロイします！`)
  const postData = JSON.stringify({"ref": value})
  const request = https.request(deployUrl, deployOptions, (response) => {
    response.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`)
    });
    response.on('end', () => {
      say({text: `${value} でデプロイはじめました。`})
    });
  }).on('error', (e) => {
    say({text: 'デプロイに失敗しました。'})
  })
  request.write(postData)
  request.end()
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
