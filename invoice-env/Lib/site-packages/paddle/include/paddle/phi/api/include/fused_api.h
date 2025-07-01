#pragma once

#include <tuple>

#include "paddle/phi/api/include/tensor.h"
#include "paddle/phi/common/scalar.h"
#include "paddle/phi/common/int_array.h"
#include "paddle/utils/optional.h"

namespace paddle {
namespace experimental {


PADDLE_API std::tuple<Tensor, Tensor> fused_dropout_add(const Tensor& x, const Tensor& y, const paddle::optional<Tensor>& seed_tensor, const Scalar& p, bool is_test, const std::string& mode, int seed = 0, bool fix_seed = false);

PADDLE_API std::tuple<Tensor, Tensor> fused_linear_param_grad_add(const Tensor& x, const Tensor& dout, const paddle::optional<Tensor>& dweight, const paddle::optional<Tensor>& dbias, bool multi_precision = true);


}  // namespace experimental
}  // namespace paddle
