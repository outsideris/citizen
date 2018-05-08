resource "aws_alb" "main" {
  name     = "${var.name}"

  security_groups = ["${var.security_groups}"]
  subnets         = ["${var.subnet_ids}"]
}
