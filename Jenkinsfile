pipeline {
  agent {
    label 'pod'
  }

  environment {
    CITIZEN_DB_DIR = './data'
    CITIZEN_STORAGE = 'file'
    CITIZEN_STORAGE_PATH = '/tmp/citizen'
    CITIZEN_ADDR = 'http://localhost:3000'
    CITIZEN_MOCK_ENABLED = true
    CITIZEN_AWS_S3_BUCKET = 'citizen.fake.bucket'
    AWS_ACCESS_KEY_ID = 'notanaccesskey'
    AWS_SECRET_ACCESS_KEY = 'notasecretkey'
    DEBUG = '*,-mocha:*,-express:*,-nock.*,-pouchdb:*,-eslint:*,-eslint*,-snapdragon:*,-body-parser:*,-morgan,-superagent'
  }

  stages {
    stage('Lint') {
      steps {
        sh 'npm install'
        sh 'npm run lint'
      }
    }

    stage('Test') {
      steps {
        sh 'npm install'
        sh 'npm test -- --forbid-only'
      }
    }
  }
}
