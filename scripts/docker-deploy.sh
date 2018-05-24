export REPO=outsideris/citizen

docker login -u $DOCKER_USER -p $DOCKER_PASS

docker build -t $REPO:$TRAVIS_TAG .

docker push $REPO
