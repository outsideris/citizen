provider "aws" {
  version = "~> 1.54"
}

provider "helm" {
  version = "~> 0.7"
}

provider "template" {
  version = "~> 1.0"
}

resource "aws_s3_bucket" "storage" {
  bucket = "${var.prefix}citizen"
  acl    = "private"

  tags = {
    App = "Citizen"
  }
}

resource "aws_iam_user" "citizen" {
  name = "${var.prefix}citizen"
}

data "template_file" "iam_policy" {
  template = "${file("${path.module}/iam_s3_policy.json")}"

  vars {
    s3_bucket = "${aws_s3_bucket.storage.bucket}"
  }
}

resource "aws_iam_user_policy" "citizen" {
  user   = "${aws_iam_user.citizen.name}"
  policy = "${data.template_file.iam_policy.rendered}"
}

resource "aws_iam_access_key" "citizen" {
  user    = "${aws_iam_user.citizen.name}"
  pgp_key = "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"
}
