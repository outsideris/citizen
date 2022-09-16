# CITIZEN_ADDR=https://<HOST> <REPO ROOT>/dist/citizen-linux \
# module  <NAMESPACE> <NAME> <PROVIDER>  v1.0.0

module "<NAME>" {
  source = "<HOST>/<NAMESPACE>/<NAME>/<PROVIDER>"
  version = "1.0.0"
}

provider "<PROVIDER NAME>" {
}
# CITIZEN_ADDR=https://<HOST> <REPO ROOT>/dist/citizen-linux \
# provider <NAMESPACE> <PROVIDER NAME> 1.0.0 4.1,5.0 -g <GPG KEY NAME>

terraform {
  required_providers {
    <PROVIDER NAME> = {
      source = "<HOST>/<NAMESPACE>/<PROVIDER NAME>"
      version = ">= 1.0.0"
    }
  }
}
